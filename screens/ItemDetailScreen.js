// screens/ItemDetailScreen.js (RNFirebase / field-safe)
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from "react-native";
import Header from "../components/Header";
import { auth } from "../src/firebase";

export default function ItemDetailScreen({ route, navigation }) {
  const { item } = route.params;

  const currentUid = auth().currentUser?.uid;

  // Support both naming conventions:
  const sellerUid = item?.sellerUid || item?.sellerId || item?.sellerUID || null;

  const isOwnListing = useMemo(() => {
    if (!currentUid || !sellerUid) return false;
    return sellerUid === currentUid;
  }, [currentUid, sellerUid]);

  const mainImage = item?.images?.[0] || "https://via.placeholder.com/1200x900";

  const startChat = () => {
    if (!currentUid) {
      navigation.replace("Login");
      return;
    }

    if (!sellerUid) {
      Alert.alert("Missing seller", "This listing is missing seller info.");
      return;
    }

    if (isOwnListing) {
      Alert.alert("This is your item");
      return;
    }

    navigation.navigate("Chat", {
      listingId: item.id,
      listingTitle: item.title || "Listing",
      sellerUid,
      sellerName: item.sellerName || "Seller",
    });
  };

  return (
    <>
      <Header title="Item Details" navigation={navigation} />
      <ScrollView style={styles.container}>
        <Image source={{ uri: mainImage }} style={styles.mainImage} />

        <View style={styles.content}>
          <Text style={styles.title}>{item.title || "Untitled"}</Text>
          <Text style={styles.price}>${item.price ?? "—"}</Text>

          <View style={styles.sellerRow}>
            <Text style={styles.seller}>by {item.sellerName || "Seller"}</Text>
            {!!item.sellerVerified && <Text style={styles.verified}>✓ Verified</Text>}
          </View>

          <Text style={styles.location}>{item.location || "Local pickup"}</Text>

          <View style={styles.escrowBadge}>
            <Text style={styles.escrowText}>Escrow Protected • Buyer & Seller Safe</Text>
          </View>

          <Text style={styles.descriptionHeader}>Description</Text>
          <Text style={styles.description}>{item.description || "No description provided."}</Text>

          <TouchableOpacity style={styles.chatButton} onPress={startChat} activeOpacity={0.9}>
            <Text style={styles.chatText}>{isOwnListing ? "You posted this" : "Message Seller"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  mainImage: { width: "100%", height: 380, backgroundColor: "#eee" },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: "800", color: "#111" },
  price: { fontSize: 36, fontWeight: "900", color: "#635BFF", marginVertical: 12 },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  seller: { fontSize: 17, color: "#444" },
  verified: { fontSize: 14, color: "#00d4aa", fontWeight: "800" },
  location: { fontSize: 16, color: "#666", marginTop: 8 },
  escrowBadge: {
    backgroundColor: "#635BFF",
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    marginVertical: 20,
  },
  escrowText: { color: "white", fontWeight: "700" },
  descriptionHeader: { fontSize: 20, fontWeight: "800", marginTop: 10 },
  description: { fontSize: 16, color: "#444", lineHeight: 24, marginTop: 8 },
  chatButton: {
    backgroundColor: "#635BFF",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginVertical: 30,
  },
  chatText: { color: "white", fontSize: 18, fontWeight: "800" },
});
