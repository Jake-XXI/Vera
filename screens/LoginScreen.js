// screens/LoginScreen.js (RNFirebase version)
import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

import { GoogleSignin } from "@react-native-google-signin/google-signin";

/* ---------------- GOOGLE CONFIG (NATIVE) ----------------
   NOTE:
   - webClientId should be your "Web client" OAuth ID in Google Cloud Console
   - For iOS it's also helpful to set iosClientId (optional if your setup works without it)
-------------------------------------------------------- */
const WEB_CLIENT_ID = "172372883824-lc98dmui3407q4i2e0utrmlpl7sjmr5o.apps.googleusercontent.com";

export default function LoginScreen({ navigation }) {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      scopes: ["email", "profile"],
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  const upsertUserDoc = async (user, provider) => {
    const ref = firestore().collection("users").doc(user.uid);

    await ref.set(
      {
        uid: user.uid,
        name: user.displayName || "Anonymous",
        email: user.email || "",
        phone: user.phoneNumber || "",
        photoURL: user.photoURL || "",
        provider,
        phoneVerified: !!user.phoneNumber, // will become true after linking phone
        selfieVerified: false, // will become true after selfie flow
        verifiedLevel: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  };

  /* ---------- GOOGLE SIGN-IN (RNFirebase) ---------- */
  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // If a prior session exists, clear it so you always get a clean flow
      try {
        await GoogleSignin.signOut();
      } catch {}

      const { idToken } = await GoogleSignin.signIn();

      if (!idToken) {
        throw new Error("Missing Google ID token");
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);

      await upsertUserDoc(userCredential.user, "google");

      navigation.replace("Home");
    } catch (error) {
      console.error("Google sign-in error:", error);
      Alert.alert("Google sign-in failed", error?.message || "Try again.");
    }
  };

  /* ---------- APPLE SIGN-IN (RNFirebase) ---------- */
  const handleAppleSignIn = async () => {
    try {
      // Create nonce pair: rawNonce (sent to Firebase), hashedNonce (sent to Apple)
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!appleCredential.identityToken) {
        throw new Error("No Apple identity token");
      }

      const appleAuthCredential = auth.AppleAuthProvider.credential(
        appleCredential.identityToken,
        rawNonce
      );

      const userCredential = await auth().signInWithCredential(appleAuthCredential);

      await upsertUserDoc(userCredential.user, "apple");

      navigation.replace("Home");
    } catch (error) {
      if (error?.code !== "ERR_CANCELED") {
        console.error("Apple Sign-In Error:", error);
        Alert.alert("Apple sign-in failed", error?.message || "Try again.");
      }
    }
  };

  return (
    <LinearGradient colors={["#635BFF", "#4C38D9"]} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoBox}>
          <Text style={styles.logo}>V</Text>
        </View>
        <Text style={styles.title}>Vera</Text>
        <Text style={styles.subtitle}>Verified Deals. Pay in Escrow.</Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.signInButton} onPress={handleGoogleSignIn}>
          <Image
            source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }}
            style={styles.icon}
          />
          <Text style={styles.buttonText}>Continue with Google</Text>
          <View style={styles.spacer} />
        </TouchableOpacity>

        {Platform.OS === "ios" && (
          <TouchableOpacity style={styles.signInButton} onPress={handleAppleSignIn}>
            <Image
              source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" }}
              style={[styles.icon, { tintColor: "#000" }]}
            />
            <Text style={styles.buttonText}>Continue with Apple</Text>
            <View style={styles.spacer} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.footer}>No fakes. No scams. Just real deals.</Text>
    </LinearGradient>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  logoBox: {
    width: 160,
    height: 160,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    marginBottom: 32,
  },
  logo: { fontSize: 96, fontWeight: "900", color: "white" },
  title: {
    fontSize: 52,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.95)",
    marginTop: 12,
    textAlign: "center",
    fontWeight: "600",
  },
  buttonGroup: {
    width: "100%",
    paddingHorizontal: 32,
    gap: 16,
    marginBottom: 60,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    height: 58,
    borderRadius: 18,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 25,
    elevation: 22,
  },
  icon: { width: 24, height: 24 },
  buttonText: {
    fontSize: 17.5,
    fontWeight: "600",
    color: "#1F1F1F",
    position: "absolute",
    left: 72,
    right: 72,
    textAlign: "center",
  },
  spacer: { width: 24 },
  footer: {
    fontSize: 14.5,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    marginBottom: 50,
  },
});
