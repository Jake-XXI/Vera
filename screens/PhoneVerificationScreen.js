import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

export default function PhoneVerificationScreen({ navigation, route }) {
  const nextRoute = route?.params?.nextRoute || "PostItem";

  const [phoneDigits, setPhoneDigits] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const unsubRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const user = auth().currentUser;
    if (!user) navigation.replace("Login");

    return () => {
      mountedRef.current = false;
      try {
        unsubRef.current?.();
      } catch {}
    };
  }, [navigation]);

  const sendCode = async () => {
    const user = auth().currentUser;
    if (!user) return;

    const digits = phoneDigits.replace(/\D/g, "").slice(0, 10);
    if (digits.length !== 10) {
      Alert.alert("Invalid number", "Enter a valid 10-digit US phone number.");
      return;
    }

    const e164 = `+1${digits}`;

    // stop any previous listener
    try {
      unsubRef.current?.();
    } catch {}
    unsubRef.current = null;

    setSending(true);

    try {
      const unsubscribe = auth().verifyPhoneNumber(e164).on("state_changed", (snap) => {
        if (!mountedRef.current) {
          try { unsubscribe(); } catch {}
          return;
        }

        if (snap.state === "sent") {
          setVerificationId(snap.verificationId);
          Alert.alert("Code sent", `We texted a code to ${e164}`);
          try { unsubscribe(); } catch {}
          unsubRef.current = null;
          setSending(false);
        }

        if (snap.state === "timeout") {
          // Not fatal — code is still usable
          // Optional: show a hint, but don't spam alerts.
        }

        if (snap.state === "verified") {
          // Auto-verification can happen on Android sometimes.
          // You could optionally link here, but we’ll keep UX consistent.
        }

        if (snap.state === "error") {
          console.error("verifyPhoneNumber error:", snap.error);
          Alert.alert("Could not send code", snap.error?.message || "Try again.");
          try { unsubscribe(); } catch {}
          unsubRef.current = null;
          setSending(false);
        }
      });

      unsubRef.current = unsubscribe;
    } catch (e) {
      console.error("Send SMS setup error:", e);
      Alert.alert("Could not send code", e?.message || "Try again.");
      setSending(false);
    }
  };

  const confirmCode = async () => {
    const user = auth().currentUser;
    if (!user) return;

    if (!verificationId) {
      Alert.alert("Missing step", "Send the code first.");
      return;
    }

    const trimmed = (code || "").trim();
    if (trimmed.length < 4) {
      Alert.alert("Invalid code", "Enter the SMS code.");
      return;
    }

    setConfirming(true);
    try {
      const credential = auth.PhoneAuthProvider.credential(verificationId, trimmed);

      // Link phone to existing Google/Apple account
      await user.linkWithCredential(credential);

      const normalized = `+1${phoneDigits.replace(/\D/g, "").slice(0, 10)}`;

      await firestore()
        .collection("users")
        .doc(user.uid)
        .set(
          {
            phone: user.phoneNumber || normalized,
            phoneVerified: true,
            verifiedLevel: 1,
            verification: {
              phone: { status: "verified", updatedAt: firestore.FieldValue.serverTimestamp() },
            },
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      navigation.replace("SelfieVerification", { nextRoute });
    } catch (e) {
      console.error("Confirm code error:", e);

      if (e?.code === "auth/credential-already-in-use") {
        Alert.alert("Number already used", "That phone number is linked to another account.");
      } else if (e?.code === "auth/invalid-verification-code") {
        Alert.alert("Invalid code", "That code wasn’t correct. Try again.");
      } else if (e?.code === "auth/provider-already-linked") {
        Alert.alert("Already verified", "This account already has a phone number linked.");
      } else {
        Alert.alert("Verification failed", e?.message || "Try again.");
      }
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your phone</Text>
      <Text style={styles.subtitle}>US numbers only. Required to sell on Vera.</Text>

      <Text style={styles.label}>Phone number</Text>
      <View style={styles.phoneRow}>
        <View style={styles.prefixBox}>
          <Text style={styles.prefixText}>+1</Text>
        </View>

        <TextInput
          style={styles.phoneInput}
          placeholder="8015551234"
          value={phoneDigits}
          onChangeText={(v) => setPhoneDigits(v.replace(/\D/g, "").slice(0, 10))}
          keyboardType="number-pad"
          editable={!verificationId && !sending}
          maxLength={10}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, (sending || verificationId) && styles.buttonDisabled]}
        onPress={sendCode}
        disabled={sending || !!verificationId}
      >
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{verificationId ? "Code sent" : "Send code"}</Text>
        )}
      </TouchableOpacity>

      {!!verificationId && (
        <>
          <Text style={[styles.label, { marginTop: 18 }]}>Verification code</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            editable={!confirming}
            maxLength={6}
          />

          <TouchableOpacity
            style={[styles.button, confirming && styles.buttonDisabled]}
            onPress={confirmCode}
            disabled={confirming}
          >
            {confirming ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirm</Text>}
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.footnote}>We’ll never show your phone number publicly.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 64, backgroundColor: "white" },
  title: { fontSize: 30, fontWeight: "900" },
  subtitle: { marginTop: 6, color: "#666", fontWeight: "600" },

  label: { marginTop: 22, marginBottom: 8, fontWeight: "800", color: "#222" },
  input: { backgroundColor: "#F3F4F6", borderRadius: 16, padding: 14, fontSize: 16 },

  phoneRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prefixBox: { backgroundColor: "#F3F4F6", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, minWidth: 56, alignItems: "center" },
  prefixText: { fontSize: 16, fontWeight: "900", color: "#222" },
  phoneInput: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 16, padding: 14, fontSize: 16 },

  button: { marginTop: 14, backgroundColor: "#635BFF", borderRadius: 16, padding: 16, alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "900" },

  footnote: { marginTop: 22, color: "#888", textAlign: "center", fontWeight: "600" },
});

