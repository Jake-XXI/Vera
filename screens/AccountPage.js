// screens/AccountPage.js (RNFirebase version)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { auth, firestore } from "../src/firebase";

export default function AccountPage({ navigation }) {
  const user = auth().currentUser;

  const [phoneDigits, setPhoneDigits] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState(null);

  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Keep the verify listener ref so we can unsubscribe
  const verifyUnsubRef = useRef(null);

  useEffect(() => {
    if (!user) navigation.replace("Login");
    return () => {
      try {
        verifyUnsubRef.current?.();
      } catch {}
    };
  }, [navigation, user]);

  const e164 = useMemo(() => {
    const digits = phoneDigits.replace(/\D/g, "").slice(0, 10);
    if (digits.length !== 10) return "";
    return `+1${digits}`;
  }, [phoneDigits]);

  const startPhoneVerification = async () => {
    if (!user) return;

    const digits = phoneDigits.replace(/\D/g, "").slice(0, 10);
    if (digits.length !== 10) {
      Alert.alert("Invalid number", "Enter a valid 10-digit US phone number.");
      return;
    }

    setSending(true);
    setVerificationId(null);

    try {
      // Clean up previous listener if any
      try {
        verifyUnsubRef.current?.();
      } catch {}

      // RNFirebase phone verification
      const unsub = auth().verifyPhoneNumber(e164).on(
        "state_changed",
        (snapshot) => {
          if (snapshot.state === "sent") {
            setVerificationId(snapshot.verificationId);
            Alert.alert("Code sent", `We texted a code to ${e164}`);
            try {
              unsub();
            } catch {}
          }

          if (snapshot.state === "error") {
            try {
              unsub();
            } catch {}
            throw snapshot.error;
          }
        }
      );

      verifyUnsubRef.current = unsub;
    } catch (error) {
      console.error("Phone verify send error:", error);
      Alert.alert("Error", error?.message || "Could not send code.");
    } finally {
      setSending(false);
    }
  };

  const confirmPhoneCode = async () => {
    if (!user) return;

    if (!verificationId) {
      Alert.alert("Missing step", "Send the code first.");
      return;
    }

    const code = (verificationCode || "").replace(/\D/g, "").slice(0, 6);
    if (code.length < 4) {
      Alert.alert("Invalid code", "Enter the SMS code.");
      return;
    }

    setConfirming(true);
    try {
      // Create phone credential and LINK it to the existing user
      const credential = auth.PhoneAuthProvider.credential(verificationId, code);

      await user.linkWithCredential(credential);

      await firestore()
        .collection("users")
        .doc(user.uid)
        .set(
          {
            phone: user.phoneNumber || e164,
            phoneVerified: true,
            verifiedLevel: 1,
            updatedAt: firestore.FieldValue.serverTimestamp(),
            verification: {
              phone: { status: "verified", updatedAt: firestore.FieldValue.serverTimestamp() },
            },
          },
          { merge: true }
        );

      Alert.alert("Phone verified!", "You’re now Level 1 verified.");
    } catch (error) {
      console.error("Confirm code error:", error);

      if (error?.code === "auth/credential-already-in-use") {
        Alert.alert("Number already used", "That phone number is linked to another account.");
      } else if (error?.code === "auth/invalid-verification-code") {
        Alert.alert("Invalid code", "That code wasn’t correct. Try again.");
      } else {
        Alert.alert("Error", error?.message || "Verification failed.");
      }
    } finally {
      setConfirming(false);
    }
  };

  const verifySellerID = async () => {
    // Your previous code called presentIdentityVerification but it isn’t wired.
    // Stripe Identity in RN requires a server endpoint (full URL) that creates a verification session.
    Alert.alert(
      "Coming next",
      "Stripe ID verification isn’t wired yet. We’ll hook this to your server endpoint + Stripe Identity flow."
    );
  };

  const signOut = async () => {
    try {
      await auth().signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  return (
    <LinearGradient colors={["#635BFF", "#4C38D9"]} style={styles.container}>
      <View style={styles.profileBox}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.displayName?.[0] || "U"}</Text>
        </View>
        <Text style={styles.name}>{user?.displayName || "User"}</Text>
        <Text style={styles.email}>{user?.email || "No email"}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Account Status</Text>
        <Text style={styles.info}>Signed in: {user ? "Yes" : "No"}</Text>
        <Text style={styles.info}>Phone: {user?.phoneNumber ? "Verified" : "Not verified"}</Text>
        <Text style={styles.info}>Seller Level: Basic</Text>
      </View>

      {/* Phone Verification */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verify Phone (Level 1)</Text>

        <TextInput
          style={styles.input}
          placeholder="10-digit US phone (e.g. 8015551234)"
          placeholderTextColor="#777"
          value={phoneDigits}
          onChangeText={(v) => setPhoneDigits(v.replace(/\D/g, "").slice(0, 10))}
          keyboardType="number-pad"
          editable={!sending && !confirming && !verificationId}
          maxLength={10}
        />

        <TouchableOpacity
          style={[styles.button, (sending || !!verificationId) && { opacity: 0.7 }]}
          onPress={startPhoneVerification}
          disabled={sending || !!verificationId}
        >
          {sending ? <ActivityIndicator /> : <Text style={styles.buttonText}>{verificationId ? "Code sent" : "Send Code"}</Text>}
        </TouchableOpacity>

        {!!verificationId && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Verification code"
              placeholderTextColor="#777"
              value={verificationCode}
              onChangeText={(v) => setVerificationCode(v.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              editable={!confirming}
              maxLength={6}
            />

            <TouchableOpacity
              style={[styles.button, confirming && { opacity: 0.7 }]}
              onPress={confirmPhoneCode}
              disabled={confirming}
            >
              {confirming ? <ActivityIndicator /> : <Text style={styles.buttonText}>Confirm Code</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ID Check */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verify as Seller (Level 2 ID Check)</Text>
        <TouchableOpacity style={styles.button} onPress={verifySellerID}>
          <Text style={styles.buttonText}>Start ID Verification</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Vera – The safe local marketplace</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  profileBox: { alignItems: "center", marginTop: 80 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarText: { fontSize: 56, fontWeight: "900", color: "white" },
  name: { fontSize: 28, fontWeight: "800", color: "white" },
  email: { fontSize: 18, color: "rgba(255,255,255,0.9)", marginTop: 8 },
  infoSection: { marginTop: 60, alignSelf: "stretch" },
  sectionTitle: { fontSize: 22, fontWeight: "700", color: "white", marginBottom: 16 },
  info: { fontSize: 18, color: "rgba(255,255,255,0.9)", marginBottom: 10 },
  section: { marginTop: 40, alignSelf: "stretch" },
  input: {
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    fontSize: 17,
  },
  button: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: { color: "#635BFF", fontSize: 18, fontWeight: "700" },
  footer: { fontSize: 14, color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 40 },
});
