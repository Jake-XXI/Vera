// App.js
import React, { useEffect } from "react";
import { NavigationContainer} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";

import LoginScreen from "./screens/LoginScreen";
import HomePage from "./screens/HomePage";
import PostItemScreen from "./screens/PostItemScreen";

import ItemDetailScreen from "./screens/ItemDetailScreen";
import ChatScreen from "./screens/ChatScreen";
import AccountPage from "./screens/AccountPage";
import { auth } from "./firebase";
// App.js
import { StripeProvider } from '@stripe/stripe-react-native';


// Add these lines


const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = React.useState("Home");

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is logged in (Google, Apple, or anonymous)
      setInitialRoute("Home");
    } else {
      // No user logged in → send to Login screen
      setInitialRoute("Login");
    }
  });

  // Clean up subscription when component unmounts
  return unsubscribe;
}, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomePage} />
        <Stack.Screen name="PostItem" component={PostItemScreen} />
        <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Account" component={AccountPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}