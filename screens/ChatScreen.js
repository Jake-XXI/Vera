// screens/ChatScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

export default function ChatScreen({ route }) {
  const { listingId, listingTitle, sellerUid, sellerName } = route.params;
  const currentUser = auth.currentUser;
  const chatId = [currentUser.uid, sellerUid].sort().join("_"); // unique chat room

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return unsubscribe;
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: input,
      senderUid: currentUser.uid,
      senderName: currentUser.displayName || "User",
      createdAt: serverTimestamp(),
    });
    setInput("");
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderUid === currentUser.uid;

    return (
      <View style={[styles.message, isMe ? styles.myMessage : styles.theirMessage]}>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.time}>
          {item.createdAt?.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <Text style={styles.header}>Chat about: {listingTitle}</Text>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.list}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  header: { fontSize: 18, fontWeight: "600", padding: 16, backgroundColor: "#635BFF", color: "white" },
  list: { flex: 1, padding: 10 },
  message: { maxWidth: "80%", padding: 12, borderRadius: 18, marginVertical: 4 },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#635BFF" },
  theirMessage: { alignSelf: "flex-start", backgroundColor: "#eee" },
  messageText: { color: "white", fontSize: 16 },
  time: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 4, alignSelf: "flex-end" },
  inputBar: { flexDirection: "row", padding: 10, backgroundColor: "white" },
  input: { flex: 1, backgroundColor: "#f0f0f0", borderRadius: 25, paddingHorizontal: 16, paddingVertical: 12 },
  sendButton: { backgroundColor: "#635BFF", paddingHorizontal: 20, borderRadius: 25, justifyContent: "center" },
  sendText: { color: "white", fontWeight: "bold" },
});