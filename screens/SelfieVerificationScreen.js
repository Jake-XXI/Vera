// screens/SelfieVerificationScreen.js (RNFirebase version)
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";

import { auth, firestore, storage } from "../src/firebase";

export default function SelfieVerificationScreen({ navigation, route }) {
  const nextRoute = route?.params?.nextRoute || "PostItem";

  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [previewUri, setPreviewUri] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) navigation.replace("Login");
  }, [navigation]);

  const takeSelfie = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      setPreviewUri(photo.uri);
    } catch (e) {
      console.error("Take selfie error:", e);
      Alert.alert("Camera error", "Could not take photo. Try again.");
    }
  };

  const retake = () => setPreviewUri(null);

  const saveSelfie = async () => {
    const user = auth().currentUser;
    if (!user) return;
    if (!previewUri) return;

    setSaving(true);
    try {
      // Compress + normalize
      const manipulated = await ImageManipulator.manipulateAsync(
        previewUri,
        [{ resize: { width: 900 } }],
        { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG }
      );

      // RNFirebase Storage upload (native)
      const path = `users/${user.uid}/profile.jpg`;
      const ref = storage().ref(path);

      await ref.putFile(manipulated.uri, { contentType: "image/jpeg" });
      const url = await ref.getDownloadURL();

      await firestore()
        .collection("users")
        .doc(user.uid)
        .set(
          {
            profilePhotoURL: url,
            selfieVerified: true,
            verification: {
              selfie: { status: "verified", updatedAt: firestore.FieldValue.serverTimestamp() },
            },
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      navigation.replace(nextRoute);
    } catch (e) {
      console.error("Save selfie error:", e);
      Alert.alert("Upload failed", e?.message || "Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Take a live selfie</Text>
        <Text style={styles.subtitle}>
          Sellers on Vera must be selfie-verified. This selfie becomes your profile photo.
        </Text>

        <TouchableOpacity style={styles.primary} onPress={requestPermission}>
          <Text style={styles.primaryText}>Allow camera</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>We do this to keep Vera free of anonymous sellers.</Text>
      </View>
    );
  }

  return (
    <View style={styles.full}>
      {!previewUri ? (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Selfie verification</Text>
            <Text style={styles.headerSub}>This photo becomes your profile picture.</Text>
          </View>

          <View style={styles.cameraWrap}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="front"
              animateShutter={false}
            />
          </View>

          <View style={styles.bottom}>
            <Text style={styles.prompt}>Hold the phone steady and look at the camera.</Text>

            <TouchableOpacity style={styles.capture} onPress={takeSelfie} disabled={saving}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Looks good?</Text>
            <Text style={styles.headerSub}>This will be visible on your seller profile.</Text>
          </View>

          <View style={styles.previewWrap}>
            <Image source={{ uri: previewUri }} style={styles.preview} />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondary} onPress={retake} disabled={saving}>
              <Text style={styles.secondaryText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primary, saving && { opacity: 0.65 }]}
              onPress={saveSelfie}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Use this photo</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: "black" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  container: { flex: 1, padding: 22, paddingTop: 70, backgroundColor: "white" },
  title: { fontSize: 30, fontWeight: "900" },
  subtitle: { marginTop: 10, color: "#666", fontWeight: "600", lineHeight: 20 },
  footnote: { marginTop: 18, color: "#888", fontWeight: "600" },

  header: { paddingTop: 60, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: "black" },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "900" },
  headerSub: { color: "rgba(255,255,255,0.75)", marginTop: 6, fontWeight: "600" },

  cameraWrap: { flex: 1, paddingHorizontal: 14, paddingBottom: 14 },
  camera: { flex: 1, borderRadius: 18, overflow: "hidden" },

  bottom: { paddingBottom: 44, alignItems: "center", justifyContent: "center" },
  prompt: { color: "rgba(255,255,255,0.78)", marginBottom: 18, fontWeight: "700" },

  capture: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: "white" },

  previewWrap: { flex: 1, padding: 14, backgroundColor: "black" },
  preview: { flex: 1, borderRadius: 18 },

  actions: { padding: 18, gap: 12, backgroundColor: "black" },

  primary: { backgroundColor: "#635BFF", padding: 16, borderRadius: 16, alignItems: "center" },
  primaryText: { color: "white", fontWeight: "900", fontSize: 16 },

  secondary: { backgroundColor: "rgba(255,255,255,0.14)", padding: 16, borderRadius: 16, alignItems: "center" },
  secondaryText: { color: "white", fontWeight: "900", fontSize: 16 },
});
