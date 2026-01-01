// App.js
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import auth from "@react-native-firebase/auth";

import LoginScreen from "./screens/LoginScreen";
import HomePage from "./screens/HomePage";
import PostItemScreen from "./screens/PostItemScreen";
import VerificationGateScreen from "./screens/VerificationGateScreen";
import PhoneVerificationScreen from "./screens/PhoneVerificationScreen";
import SelfieVerificationScreen from "./screens/SelfieVerificationScreen";
import ItemDetailScreen from "./screens/ItemDetailScreen";
import ChatScreen from "./screens/ChatScreen";
import AccountPage from "./screens/AccountPage";

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomePage} />
            <Stack.Screen name="PostItem" component={PostItemScreen} />
            <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Account" component={AccountPage} />
            <Stack.Screen name="VerificationGate" component={VerificationGateScreen} />
            <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
            <Stack.Screen name="SelfieVerification" component={SelfieVerificationScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
