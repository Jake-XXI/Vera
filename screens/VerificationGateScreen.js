// screens/VerificationGateScreen.js (RNFirebase version)
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { auth, firestore } from "../src/firebase";

export default function VerificationGateScreen({ navigation, route }) {
  const nextRoute = route?.params?.nextRoute || "PostItem";

  const [state, setState] = useState({
    loading: true,
    phoneVerified: false,
    selfieVerified: false,
  });

  // Prevent double replace loops
  const navigatedRef = useRef(false);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      navigation.replace("Login");
      return;
    }

    const unsub = firestore()
      .collection("users")
      .doc(user.uid)
      .onSnapshot(
        (snap) => {
          const d = snap.exists ? snap.data() : {};
          setState({
            loading: false,
            phoneVerified: d?.phoneVerified === true || !!user.phoneNumber, // fallback
            selfieVerified: d?.selfieVerified === true,
          });
        },
        (err) => {
          console.error("VerificationGate snapshot error:", err);
          setState((s) => ({ ...s, loading: false }));
        }
      );

    return () => unsub();
  }, [navigation]);

  useEffect(() => {
    if (state.loading) return;
    if (navigatedRef.current) return;

    navigatedRef.current = true;

    if (!state.phoneVerified) {
      navigation.replace("PhoneVerification", { nextRoute });
      return;
    }

    if (!state.selfieVerified) {
      navigation.replace("SelfieVerification", { nextRoute });
      return;
    }

    navigation.replace(nextRoute);
  }, [state.loading, state.phoneVerified, state.selfieVerified, navigation, nextRoute]);

  return (
    <View style={styles.container}>
      <ActivityIndicator />
      <Text style={styles.text}>Checking verification…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { marginTop: 10, fontWeight: "700" },
});
