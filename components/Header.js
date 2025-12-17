// components/Header.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function Header({ title, navigation }) {
  return (
    <LinearGradient colors={["#635BFF", "#4C38D9"]} style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.homeBtn}>
        <Text style={styles.homeText}>Home</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <View style={{ width: 60 }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "800", color: "white" },
  homeBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  homeText: { color: "white", fontWeight: "700" },
});