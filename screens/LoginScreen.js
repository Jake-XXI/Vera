// screens/LoginScreen.js
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { auth, db } from "../firebase";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "vera" });

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "794163430672-1eff157bf55bcad0541195.apps.googleusercontent.com",
    iosClientId: "794163430672-1eff157bf55bcad0541195.apps.googleusercontent.com",
    androidClientId: "794163430672-1eff157bf55bcad0541195.apps.googleusercontent.com",
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then(async (userCredential) => {
          const user = userCredential.user;
          const userRef = doc(db, "users", user.uid);

          await setDoc(userRef, {
            name: user.displayName || "Anonymous",
            email: user.email,
            phone: user.phoneNumber || "",
            verifiedLevel: 1, // Level 1 by default
            verifiedSeller: false,
            location: "Utah", // Default for MVP
            createdAt: serverTimestamp(),
          }, { merge: true });

          // Send email verification for Level 1
          if (!user.emailVerified) {
            await sendEmailVerification(user);
          }

          navigation.replace("Home");
        })
        .catch(console.error);
    }
  }, [response]);

  const handleAppleSignIn = async () => {
    try {
      const rawNonce = Math.random().toString(36).substring(2, 10);
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

      if (!appleCredential.identityToken) throw new Error("No token");

      const provider = new OAuthProvider("apple.com");
      const credential = provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce,
      });

      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      const userRef = doc(db, "users", user.uid);

      await setDoc(userRef, {
        name: user.displayName || "Anonymous",
        email: user.email,
        phone: user.phoneNumber || "",
        verifiedLevel: 1, // Level 1 by default
        verifiedSeller: false,
        location: "Utah", // Default for MVP
        createdAt: serverTimestamp(),
      }, { merge: true });

      // Send email verification for Level 1
      if (!user.emailVerified) {
        await sendEmailVerification(user);
      }

      navigation.replace("Home");
    } catch (error) {
      if (error.code !== "ERR_CANCELED") console.error(error);
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
        <TouchableOpacity
          style={styles.signInButton}
          onPress={async () => {
            await AuthSession.dismiss();
            promptAsync();
          }}
          disabled={!request}
        >
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
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
  title: { fontSize: 52, fontWeight: "800", color: "white", letterSpacing: -0.5 },
  subtitle: { fontSize: 18, color: "rgba(255,255,255,0.95)", marginTop: 12, textAlign: "center", fontWeight: "600" },
  buttonGroup: { width: "100%", paddingHorizontal: 32, gap: 16, marginBottom: 60 },
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
  buttonText: { fontSize: 17.5, fontWeight: "600", color: "#1F1F1F", position: "absolute", left: 72, right: 72, textAlign: "center" },
  spacer: { width: 24 },
  footer: { fontSize: 14.5, color: "rgba(255,255,255,0.75)", textAlign: "center", marginBottom: 50 },
});