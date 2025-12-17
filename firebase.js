// firebase.js (root folder)
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDvyYFiUfwUA0EiQqHI2TGEjdtDFMmuSkg",
  authDomain: "flair-marketplace.firebaseapp.com",
  projectId: "flair-marketplace",
  storageBucket: "flair-marketplace.firebasestorage.app",
  messagingSenderId: "794163430672",
  appId: "1:794163430672:web:1eff157bf55bcad0541195",
  measurementId: "G-CTRTGDEM28"
};

let auth;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

if (getApps().length === 0) {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} else {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);