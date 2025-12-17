import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

const myListings = [
  { id: "1", title: "My Item 1", price: "$20" },
  { id: "2", title: "My Item 2", price: "$50" },
  { id: "3", title: "My Item 3", price: "$35" },
];

export default function ListingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Listings</Text>
      <FlatList
        data={myListings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.price}>{item.price}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", color: "#555555", marginBottom: 10 },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  itemTitle: { fontWeight: "bold", color: "#555555" },
  price: { color: "#555555", marginTop: 3 },
});
