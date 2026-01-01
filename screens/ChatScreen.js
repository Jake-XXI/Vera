// screens/ChatScreen.js (RNFirebase version)
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { auth, firestore } from "../src/firebase";

export default function ChatScreen({ route, navigation }) {
  const { listingId, listingTitle, sellerUid, sellerName } = route.params;

  const currentUser = auth().currentUser;

  useEffect(() => {
    if (!currentUser) navigation?.replace?.("Login");
  }, [currentUser, navigation]);

  const chatId = useMemo(() => {
    if (!currentUser?.uid || !sellerUid) return "";
    return [currentUser.uid, sellerUid].sort().join("_");
  }, [currentUser?.uid, sellerUid]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const listRef = useRef(null);

  useEffect(() => {
    if (!chatId) return;

    const q = firestore()
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limit(200);

    const unsubscribe = q.onSnapshot(
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(msgs);

        // Auto-scroll after render
        setTimeout(() => {
          try {
            listRef.current?.scrollToEnd?.({ animated: true });
          } catch {}
        }, 0);
      },
      (err) => {
        console.error("Chat snapshot error:", err);
      }
    );

    return unsubscribe;
  }, [chatId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    if (!currentUser || !chatId) return;

    setInput("");

    const chatRef = firestore().collection("chats").doc(chatId);
    const msgRef = chatRef.collection("messages").doc();

    try {
      // Ensure chat room doc exists / is updated (nice for listing chats later)
      await chatRef.set(
        {
          chatId,
          listingId: listingId || null,
          listingTitle: listingTitle || "",
          buyerUid: currentUser.uid,
          buyerName: currentUser.displayName || "User",
          sellerUid: sellerUid,
          sellerName: sellerName || "Seller",
          updatedAt: firestore.FieldValue.serverTimestamp(),
          createdAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Add message
      await msgRef.set({
        text,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || "User",
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.error("Send message error:", e);
      // restore input so the user doesn’t lose it
      setInput(text);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderUid === currentUser?.uid;

    const time =
      item.createdAt?.toDate?.()?.toLocaleTimeString?.([], {
        hour: "2-digit",
        minute: "2-digit",
      }) || "";

    return (
      <View style={[styles.message, isMe ? styles.myMessage : styles.theirMessage]}>
        <Text style={[styles.messageText, !isMe && styles.messageTextDark]}>{item.text}</Text>
        {!!time && (
          <Text style={[styles.time, !isMe && styles.timeDark]}>
            {time}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <Text style={styles.header}>Chat about: {listingTitle}</Text>

      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 10 }}
        onContentSizeChange={() => {
          try {
            listRef.current?.scrollToEnd?.({ animated: true });
          } catch {}
        }}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor="#888"
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton} activeOpacity={0.85}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  header: {
    fontSize: 18,
    fontWeight: "600",
    padding: 16,
    backgroundColor: "#635BFF",
    color: "white",
  },
  list: { flex: 1, padding: 10 },

  message: { maxWidth: "80%", padding: 12, borderRadius: 18, marginVertical: 4 },

  myMessage: { alignSelf: "flex-end", backgroundColor: "#635BFF" },
  theirMessage: { alignSelf: "flex-start", backgroundColor: "#eee" },

  messageText: { color: "white", fontSize: 16 },
  messageTextDark: { color: "#111" },

  time: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeDark: { color: "rgba(0,0,0,0.45)" },

  inputBar: { flexDirection: "row", padding: 10, backgroundColor: "white" },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#111",
  },
  sendButton: {
    backgroundColor: "#635BFF",
    paddingHorizontal: 20,
    borderRadius: 25,
    justifyContent: "center",
    marginLeft: 8,
  },
  sendText: { color: "white", fontWeight: "bold" },
});
