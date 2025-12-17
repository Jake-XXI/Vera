// screens/HomePage.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase"; // ← your firebase.js file
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";


// Demo listings (show if no real data)
const demoItems = [
  {
    id: "demo1",
    title: "iPhone 15 Pro Max 256GB",
    price: 950,
    sellerName: "Alex Chen",
    sellerVerified: true,
    images: ["https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800"],
    location: "Salt Lake City, UT",
  },
  {
    id: "demo2",
    title: "PS5 Slim + 2 Controllers",
    price: 420,
    sellerName: "Maria G.",
    sellerVerified: true,
    images: ["https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800"],
    location: "Provo, UT",
  },
  {
    id: "demo3",
    title: "MacBook Air M2 2023",
    price: 1050,
    sellerName: "Jake",
    sellerVerified: false,
    images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"],
    location: "Ogden, UT",
  },
];

export default function HomePage({ navigation }) {
  const [items, setItems] = useState(demoItems); // Start with demos

  useEffect(() => {
    const q = query(
      collection(db, "listings"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setItems(demoItems); // No real data? Show demos
      } else {
        const listings = [];
        snapshot.forEach((doc) => {
          listings.push({ id: doc.id, ...doc.data() });
        });
        setItems(listings); // Real data? Replace with real
      }
    });

    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ItemDetail", { item })}
    >
      <Image
        source={{ uri: item.images?.[0] || "https://via.placeholder.com/400" }}
        style={styles.itemImage}
      />

      <View style={styles.cardContent}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.price}>${item.price}</Text>

        <View style={styles.sellerRow}>
          <Text style={styles.seller}>by {item.sellerName || "Anonymous"}</Text>
          {item.sellerVerified && <Text style={styles.verifiedBadge}>Verified</Text>}
        </View>

        <Text style={styles.location}>{item.location || "Local Pickup"}</Text>

        <View style={styles.badges}>
          <View style={styles.escrowBadge}>
            <Text style={styles.escrowText}>Escrow Protected</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#635BFF", "#4C38D9"]} style={styles.header}>
        <Text style={styles.headerTitle}>Vera</Text>
        <Text style={styles.headerSubtitle}>Verified deals near you</Text>
      </LinearGradient>
                {/* Gear Icon - Account Button */}
                <TouchableOpacity
              style={styles.gearButton}
              onPress={() => navigation.navigate("Account")}
                >
                <Text style={styles.gearIcon}>⚙️</Text>
                </TouchableOpacity> 
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>No listings yet. Be the first to post!</Text>
        }
      />

      {/* Floating + Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("PostItem")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
    

  );

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  headerTitle: { fontSize: 40, fontWeight: "900", color: "white" },
  headerSubtitle: { fontSize: 17, color: "rgba(255,255,255,0.9)", marginTop: 6 },
  list: { padding: 16 },
  empty: { textAlign: "center", fontSize: 18, color: "#888", marginTop: 100 },

  card: {
    backgroundColor: "white",
    borderRadius: 22,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 20,
  },
  itemImage: { width: "100%", height: 240, backgroundColor: "#eee" },
  cardContent: { padding: 18 },
  itemTitle: { fontSize: 19, fontWeight: "700", color: "#1a1a1a", lineHeight: 26 },
  price: { fontSize: 28, fontWeight: "800", color: "#635BFF", marginTop: 8 },
  sellerRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 10 },
  seller: { fontSize: 15, color: "#666" },
  verifiedBadge: { fontSize: 13, color: "#00d4aa", fontWeight: "700" },
  location: { fontSize: 15, color: "#888", marginTop: 4 },
  badges: { marginTop: 14 },
  escrowBadge: {
    backgroundColor: "#635BFF",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
  },
  escrowText: { color: "white", fontSize: 13.5, fontWeight: "700" },

  fab: {
    position: "absolute",
    right: 24,
    bottom: 30,
    backgroundColor: "#635BFF",
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  fabText: { fontSize: 38, color: "white", fontWeight: "300", marginTop: -3 },
  gearButton: {
  position: "absolute",
  top: 50,
  right: 20,
  zIndex: 10,
  backgroundColor: "rgba(255,255,255,0.2)",
  padding: 12,
  borderRadius: 30,
},
gearIcon: { fontSize: 24 },
});