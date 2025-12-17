// screens/ItemDetailScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../firebase";
import Header from "../components/Header";

export default function ItemDetailScreen({ route, navigation }) {
  const { item } = route.params;
  const isOwnListing = item.sellerUid === auth.currentUser?.uid;

  const startChat = () => {
    if (isOwnListing) {
      Alert.alert("This is your item");
      return;
    }
    navigation.navigate("Chat", {
      listingId: item.id,
      listingTitle: item.title,
      sellerUid: item.sellerUid,
      sellerName: item.sellerName,
    });
  };
// In ItemDetailScreen.js
const { useStripe } = useStripe();

const buyWithEscrow = async () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // Call backend for PaymentIntent
  const { clientSecret } = await fetch('/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: item.price * 100, listingId: item.id }),
  }).then(r => r.json());

  await initPaymentSheet({ paymentIntentClientSecret: clientSecret });
  const { error } = await presentPaymentSheet();

  if (error) {
    Alert.alert("Payment error", error.message);
  } else {
    Alert.alert("Success", "Funds held in escrow. Awaiting delivery confirmation.");
    // Notify seller via chat or push
  }
};
  return (
    <>
    <Header title="Item Details" navigation={navigation} />
    <ScrollView style={styles.container}>
      <Image source={{ uri: item.images[0] }} style={styles.mainImage} />

      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.price}>${item.price}</Text>

        <View style={styles.sellerRow}>
          <Text style={styles.seller}>by {item.sellerName}</Text>
          {item.sellerVerified && <Text style={styles.verified}>Verified</Text>}
        </View>

        <Text style={styles.location}>{item.location}</Text>

        <View style={styles.escrowBadge}>
          <Text style={styles.escrowText}>Escrow Protected • Buyer & Seller Safe</Text>
        </View>

        <Text style={styles.descriptionHeader}>Description</Text>
        <Text style={styles.description}>
          {item.description || "No description provided."}
        </Text>

        <TouchableOpacity style={styles.chatButton} onPress={startChat}>
          <Text style={styles.chatText}>
            {isOwnListing ? "You posted this" : "Message Seller"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  mainImage: { width: "100%", height: 380 },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: "800", color: "#1a1a" },
  price: { fontSize: 36, fontWeight: "900", color: "#635BFF", marginVertical: 12 },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  seller: { fontSize: 17, color: "#444" },
  verified: { fontSize: 14, color: "#00d4aa", fontWeight: "700" },
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
  descriptionHeader: { fontSize: 20, fontWeight: "700", marginTop: 10 },
  description: { fontSize: 16, color: "#444", lineHeight: 24, marginTop: 8 },
  chatButton: {
    backgroundColor: "#635BFF",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginVertical: 30,
  },
  chatText: { color: "white", fontSize: 18, fontWeight: "700" },
});