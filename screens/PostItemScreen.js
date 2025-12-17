// screens/PostItemScreen.js
import React, { useState } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import Header from "../components/Header";

export default function PostItemScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Salt Lake City, UT");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selected = result.assets.map(asset => asset.uri);
      if (images.length + selected.length > 4) {
        Alert.alert("Max 4 photos");
        return;
      }
      setImages([...images, ...selected]);
    }
  };

  const uploadImages = async () => {
    const urls = [];
    const storage = getStorage();

    for (let uri of images) {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = uri.substring(uri.lastIndexOf("/") + 1);
      const storageRef = ref(storage, `listings/${Date.now()}_${filename}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    }
    return urls;
  };

  const postListing = async () => {
    if (!title || !price || images.length === 0) {
      Alert.alert("Missing fields", "Please add title, price, and at least one photo");
      return;
    }

    setUploading(true);
    try {
      const imageUrls = await uploadImages();

      await addDoc(collection(db, "listings"), {
        title,
        price: Number(price),
        description,
        location,
        images: imageUrls,
        sellerUid: auth.currentUser.uid,
        sellerName: auth.currentUser.displayName || "Anonymous",
        sellerVerified: false, // can be true later
        escrowProtected: true,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success!", "Your item is live on Vera");
      navigation.replace("Home");   // or navigation.navigate("Home")
    } catch (e) {
      Alert.alert("Error", "Could not post. Try again.");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
    <Header title="Post on Vera" navigation={navigation} />
    <LinearGradient colors={["#635BFF", "#4C38D9"]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.header}>Sell on Vera</Text>

          <TextInput
            style={styles.input}
            placeholder="Item title (e.g. iPhone 15)"
            placeholderTextColor="#aaa"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={styles.input}
            placeholder="Price in USD"
            placeholderTextColor="#aaa"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (condition, specs, etc.)"
            placeholderTextColor="#aaa"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TextInput
            style={styles.input}
            placeholder="Location (e.g. Provo, UT)"
            placeholderTextColor="#aaa"
            value={location}
            onChangeText={setLocation}
          />

          <TouchableOpacity style={styles.photoButton} onPress={pickImages}>
            <Text style={styles.photoText}>
              {images.length === 0 ? "Add Photos (up to 4)" : `${images.length} photos selected`}
            </Text>
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreview}>
            {images.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.previewImage} />
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.postButton, uploading && styles.postButtonDisabled]}
            onPress={postListing}
            disabled={uploading}
          >
            <Text style={styles.postButtonText}>
              {uploading ? "Posting..." : "Post Item – Escrow Protected"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 60 },
  header: { fontSize: 32, fontWeight: "800", color: "white", marginBottom: 30, textAlign: "center" },
  input: {
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    fontSize: 17,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  photoButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  photoText: { color: "white", fontSize: 17, fontWeight: "600" },
  imagePreview: { marginBottom: 20 },
  previewImage: { width: 100, height: 100, borderRadius: 12, marginRight: 10 },
  postButton: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  postButtonDisabled: { opacity: 0.6 },
  postButtonText: { color: "#635BFF", fontSize: 18, fontWeight: "700" },
});