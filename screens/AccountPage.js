// screens/AccountPage.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from "../firebase";
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useStripe } from "@stripe/stripe-react-native";

export default function AccountPage({ navigation }) {
  const user = auth.currentUser;
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState("");

  const startPhoneVerification = async () => {
    try {
      const verification = await auth.verifyPhoneNumber(phoneNumber);
      setVerificationId(verification);
      Alert.alert("Code sent to your phone");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const confirmPhoneCode = async () => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      await signInWithCredential(auth, credential);
      await updateDoc(doc(db, "users", user.uid), { verifiedLevel: 1, phone: phoneNumber });
      Alert.alert("Phone verified!");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const verifySellerID = async () => {
    try {
      const { clientSecret } = await fetch("/create-identity-verification-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      }).then((r) => r.json());

      const { error } = await presentIdentityVerification(clientSecret);

      if (error) {
        Alert.alert("Verification failed", error.message);
      } else {
        await updateDoc(doc(db, "users", user.uid), { verifiedSeller: true, verifiedLevel: 2 });
        Alert.alert("Seller verified!");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <LinearGradient colors={["#635BFF", "#4C38D9"]} style={styles.container}>
      <View style={styles.profileBox}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.[0] || "U"}
          </Text>
        </View>
        <Text style={styles.name}>{user?.displayName || "User"}</Text>
        <Text style={styles.email}>{user?.email || "No email"}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Account Status</Text>
        <Text style={styles.info}>Verified: {user?.emailVerified ? "Yes" : "No"}</Text>
        <Text style={styles.info}>Seller Level: Basic</Text>
      </View>

      {/* Phone Verification */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verify Phone (Level 1)</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone number (e.g. +1 555-1234)"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />
        <TouchableOpacity style={styles.button} onPress={startPhoneVerification}>
          <Text style={styles.buttonText}>Send Code</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Verification code"
          value={verificationCode}
          onChangeText={setVerificationCode}
        />
        <TouchableOpacity style={styles.button} onPress={confirmPhoneCode}>
          <Text style={styles.buttonText}>Confirm Code</Text>
        </TouchableOpacity>
      </View>

      {/* ID Check */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verify as Seller (Level 2 ID Check)</Text>
        <TouchableOpacity style={styles.button} onPress={verifySellerID}>
          <Text style={styles.buttonText}>Start ID Verification</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => auth.signOut()}>
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
  input: { backgroundColor: "rgba(255,255,255,0.9)", padding: 16, borderRadius: 18, marginBottom: 16, fontSize: 17 },
  button: { backgroundColor: "white", padding: 18, borderRadius: 18, alignItems: "center", marginBottom: 20 },
  buttonText: { color: "#635BFF", fontSize: 18, fontWeight: "700" },
  footer: { fontSize: 14, color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 40 },
});