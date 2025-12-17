import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

export default function EnableLocationScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const requestLocation = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setErrorMsg("Location permission denied. Please enable it in Settings.");
        setLoading(false);
        return;
      }

      // Success → go to Login
      navigation.replace("Login");
    } catch (e) {
      setErrorMsg("Something went wrong. Please try again.");
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="location-sharp" size={90} color="#FF4500" />

      <Text style={styles.title}>Enable Location</Text>
      <Text style={styles.subtitle}>
        We use your location to show nearby listings.
      </Text>

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color="#FF4500" style={{ marginTop: 30 }} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={requestLocation}>
          <Text style={styles.buttonText}>Share My Location</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ------------------------------------------------
// STYLES
// ------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#222222",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#555555",
    marginTop: 6,
    textAlign: "center",
    width: "80%",
  },
  error: {
    color: "red",
    marginTop: 15,
    fontSize: 14,
    textAlign: "center",
    width: "80%",
  },
  button: {
    backgroundColor: "#FF4500",
    paddingVertical: 16,
    paddingHorizontal: 45,
    borderRadius: 14,
    marginTop: 35,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
