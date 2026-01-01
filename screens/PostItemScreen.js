// screens/PostItemScreen.js (RNFirebase version)
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

import { auth, firestore, storage } from "../src/firebase";
import Header from "../components/Header";

const CATEGORIES = ["Phones", "Gaming", "Laptops", "Local"];

function toNumberPrice(input) {
  const cleaned = String(input).replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export default function PostItemScreen({ navigation }) {
  const user = auth().currentUser;

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Salt Lake City, UT");

  const [images, setImages] = useState([]); // local URIs
  const [uploading, setUploading] = useState(false);

  const priceNumber = useMemo(() => toNumberPrice(price), [price]);

  const ensureSignedIn = () => {
    if (!user) {
      Alert.alert("Sign in required", "Please sign in before posting a listing.");
      navigation.replace("Login");
      return false;
    }
    return true;
  };

  /* ---------------- IMAGE PICKING ---------------- */

  const pickImages = async () => {
    if (!ensureSignedIn()) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Please allow photo access to add listing photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
    });

    if (result.canceled) return;

    const selected = result.assets.map((a) => a.uri);
    const next = [...images, ...selected].slice(0, 4);
    setImages(next);
  };

  const removeImage = (uri) => {
    setImages((prev) => prev.filter((x) => x !== uri));
  };

  /* ---------------- STORAGE UPLOAD (RNFirebase) ---------------- */

  const uploadImagesForListing = async ({ listingId }) => {
    const urls = [];

    for (let i = 0; i < images.length; i++) {
      const uri = images[i];

      const path = `listings/${user.uid}/${listingId}/img_${i + 1}_${Date.now()}.jpg`;
      const ref = storage().ref(path);

      // RNFirebase native upload (NO blobs)
      await ref.putFile(uri);

      const url = await ref.getDownloadURL();
      urls.push(url);
    }

    return urls;
  };

  /* ---------------- POST LISTING ---------------- */

  const postListing = async () => {
    if (!ensureSignedIn() || uploading) return;

    const trimmedTitle = title.trim();
    const trimmedLocation = location.trim();

    if (!trimmedTitle) return Alert.alert("Missing title", "Please enter a title.");
    if (!priceNumber) return Alert.alert("Invalid price", "Enter a valid price (e.g. 950).");
    if (!category) return Alert.alert("Missing category", "Choose a category.");
    if (images.length < 1) return Alert.alert("Add a photo", "Add at least one photo.");

    setUploading(true);

    try {
      // 🔹 Fetch seller profile info
      const userSnap = await firestore()
        .collection("users")
        .doc(user.uid)
        .get();

      const userData = userSnap.exists ? userSnap.data() : {};
      const sellerPhotoURL = userData?.profilePhotoURL || user.photoURL || "";

      // 1) Create listing doc FIRST
      const listingRef = firestore().collection("listings").doc();

      await listingRef.set({
        title: trimmedTitle,
        price: priceNumber,
        category,
        description: description.trim(),
        location: trimmedLocation || "Local pickup",
        images: [],
        sellerId: user.uid,
        sellerName: user.displayName || "Seller",
        sellerPhotoURL,
        sellerVerified: false,
        escrowProtected: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // 2) Upload images → update doc
      const imageUrls = await uploadImagesForListing({ listingId: listingRef.id });

      await listingRef.update({
        images: imageUrls,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert("Success!", "Your item is live on Vera.");
      navigation.navigate("Home");
    } catch (e) {
      console.error("Post listing error:", e);
      Alert.alert(
        "Error",
        "Could not post your item. Check Firestore/Storage rules and try again."
      );
    } finally {
      setUploading(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <>
      <Header title="Post on Vera" navigation={navigation} />
      <LinearGradient colors={["#635BFF", "#4C38D9"]} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.header}>Sell on Vera</Text>

            <TextInput
              style={styles.input}
              placeholder="Item title (e.g. iPhone 15 Pro Max)"
              placeholderTextColor="#aaa"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            <TextInput
              style={styles.input}
              placeholder="Price in USD (e.g. 950)"
              placeholderTextColor="#aaa"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    onPress={() => setCategory(c)}
                    activeOpacity={0.85}
                    disabled={uploading}
                  >
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (condition, specs, etc.)"
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={1200}
            />

            <TextInput
              style={styles.input}
              placeholder="Location (e.g. Provo, UT)"
              placeholderTextColor="#aaa"
              value={location}
              onChangeText={setLocation}
              maxLength={60}
            />

            <TouchableOpacity
              style={styles.photoButton}
              onPress={pickImages}
              disabled={uploading}
            >
              <Text style={styles.photoText}>
                {images.length === 0
                  ? "Add Photos (up to 4)"
                  : `${images.length} photos selected`}
              </Text>
            </TouchableOpacity>

            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreview}>
                {images.map((uri) => (
                  <View key={uri} style={styles.previewWrap}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      onPress={() => removeImage(uri)}
                      style={styles.removeBtn}
                      disabled={uploading}
                    >
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.postButton, uploading && styles.postButtonDisabled]}
              onPress={postListing}
              disabled={uploading}
            >
              {uploading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <ActivityIndicator />
                  <Text style={styles.postButtonText}>Posting…</Text>
                </View>
              ) : (
                <Text style={styles.postButtonText}>Post Item – Escrow Protected</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              Tip: your listing appears instantly once createdAt + images are set.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

/* ---------------- STYLES (unchanged) ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  header: { fontSize: 32, fontWeight: "800", color: "white", marginBottom: 18, textAlign: "center" },

  label: { color: "rgba(255,255,255,0.92)", fontWeight: "800", marginBottom: 10, marginTop: 4 },

  input: {
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    fontSize: 17,
  },
  textArea: { height: 110, textAlignVertical: "top" },

  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  categoryChip: {
    backgroundColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  categoryChipActive: { backgroundColor: "white" },
  categoryText: { color: "white", fontWeight: "800" },
  categoryTextActive: { color: "#635BFF", fontWeight: "900" },

  photoButton: {
    backgroundColor: "rgba(255,255,255,0.20)",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  photoText: { color: "white", fontSize: 16.5, fontWeight: "700" },

  imagePreview: { marginBottom: 18 },
  previewWrap: { marginRight: 10 },
  previewImage: { width: 108, height: 108, borderRadius: 14 },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { color: "white", fontWeight: "900" },

  postButton: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  postButtonDisabled: { opacity: 0.65 },
  postButtonText: { color: "#635BFF", fontSize: 18, fontWeight: "800" },

  hint: {
    marginTop: 12,
    textAlign: "center",
    color: "rgba(255,255,255,0.78)",
    fontWeight: "600",
  },
});
