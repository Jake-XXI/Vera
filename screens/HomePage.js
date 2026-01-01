// screens/HomePage.js
// Marketplace Home (v2):
// - Fixed header that cannot be dragged
// - Collapsing header on scroll (logo/tagline collapse, search stays)
// - Category chips live in scroll content (chips scroll away; search stays fixed)
// - Server-side Firestore filters (category, verified) + client-side search + sort
// - Simple bottom tab bar (in-screen) for MVP navigation

// screens/HomePage.js (RNFirebase rewrite + improvements)
// Based on your original structure :contentReference[oaicite:1]{index=1}

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { firestore } from "../src/firebase"; // your Step 0 barrel now exports RNFirebase instances

const CATEGORIES = ["All", "Phones", "Gaming", "Laptops", "Local"];
const SORTS = [
  { key: "new", label: "Newest" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
];

const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

export default function HomePage({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Responsive typography (clamped)
  const H1 = useMemo(() => clamp(width * 0.095, 30, 40), [width]);
  const H2 = useMemo(() => clamp(width * 0.042, 14, 18), [width]);

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [category, setCategory] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortKey, setSortKey] = useState("new");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const searchInputRef = useRef(null);

  // Animated scroll for collapsing header
  const scrollY = useRef(new Animated.Value(0)).current;

  // Header sizing
  const HEADER_TOP = insets.top; // paint behind status bar
  const HEADER_MAX = HEADER_TOP + 150; // expanded
  const HEADER_MIN = HEADER_TOP + 82; // collapsed (search still visible)

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [HEADER_MAX, HEADER_MIN],
    extrapolate: "clamp",
  });

  const headerContentOpacity = scrollY.interpolate({
    inputRange: [0, 55],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const headerContentTranslate = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [0, -14],
    extrapolate: "clamp",
  });

  // Debounce search so filtering doesn’t stutter while typing fast
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim().toLowerCase()), 120);
    return () => clearTimeout(t);
  }, [search]);

  /**
   * Firestore query strategy (RNFirebase):
   * - Server-side filters: category, verifiedOnly
   * - Always order by createdAt desc and limit 50
   *
   * Your original did this with web SDK constraints :contentReference[oaicite:2]{index=2}
   * Here we use RNFirebase query chaining.
   */
  useEffect(() => {
    setLoading(true);
    setErrorMsg("");

    let q = firestore().collection("listings");

    if (category !== "All") q = q.where("category", "==", category);
    if (verifiedOnly) q = q.where("sellerVerified", "==", true);

    q = q.orderBy("createdAt", "desc").limit(50);

    const unsub = q.onSnapshot(
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(data);
        setLoading(false);
      },
      (err) => {
        console.error("Listings snapshot error:", err);
        setErrorMsg(err?.message || "Could not load listings.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [category, verifiedOnly]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setErrorMsg("");

    try {
      // Force one-time fetch (even though onSnapshot keeps it fresh)
      let q = firestore().collection("listings");
      if (category !== "All") q = q.where("category", "==", category);
      if (verifiedOnly) q = q.where("sellerVerified", "==", true);

      q = q.orderBy("createdAt", "desc").limit(50);

      const snap = await q.get();
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(data);
    } catch (err) {
      console.error("Refresh error:", err);
      setErrorMsg(err?.message || "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }, [category, verifiedOnly]);

  const filteredAndSorted = useMemo(() => {
    let out = items;

    if (searchDebounced) {
      out = out.filter((i) => {
        const title = (i.title || "").toLowerCase();
        const loc = (i.location || "").toLowerCase();
        return title.includes(searchDebounced) || loc.includes(searchDebounced);
      });
    }

    if (sortKey === "price_asc") {
      out = [...out].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortKey === "price_desc") {
      out = [...out].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else {
      out = [...out];
    }

    return out;
  }, [items, searchDebounced, sortKey]);

  const renderListing = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={() => navigation.navigate("ItemDetail", { item })}
    >
      <Image
        source={{ uri: item.images?.[0] || "https://via.placeholder.com/800" }}
        style={styles.image}
      />

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title || "Untitled"}
          </Text>
          <View style={styles.escrowPill}>
            <Text style={styles.escrowText}>Escrow</Text>
          </View>
        </View>

        <Text style={styles.price}>${item.price ?? "—"}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.seller} numberOfLines={1}>
            {item.sellerName || "Seller"}
          </Text>
          {item.sellerVerified ? (
            <Text style={styles.verified}>✓ Verified</Text>
          ) : (
            <Text style={styles.unverified}>Unverified</Text>
          )}
        </View>

        <Text style={styles.location} numberOfLines={1}>
          📍 {item.location || "Local pickup"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Chips/filters live in scroll content so they scroll away (search stays fixed)
  const ScrollHeader = (
    <View style={styles.scrollHeaderWrap}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        scrollEventThrottle={16}
      >
        {CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setCategory(c)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </Animated.ScrollView>

      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterPill, verifiedOnly && styles.filterPillActive]}
          onPress={() => setVerifiedOnly((v) => !v)}
          activeOpacity={0.85}
        >
          <Text style={[styles.filterText, verifiedOnly && styles.filterTextActive]}>
            {verifiedOnly ? "✓ Verified" : "All sellers"}
          </Text>
        </TouchableOpacity>

        <View style={styles.sortRow}>
          {SORTS.map((s) => {
            const active = sortKey === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setSortKey(s.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Latest listings</Text>
        <Text style={styles.sectionHint}>{filteredAndSorted.length} items</Text>
      </View>

      {!!errorMsg && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      )}
    </View>
  );

  const bottomBarHeight = 62 + Math.max(insets.bottom, 0);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* FIXED, COLLAPSING HEADER (cannot be dragged) */}
      <Animated.View style={[styles.fixedHeader, { height: headerHeight }]}>
        <LinearGradient colors={["#635BFF", "#4C38D9"]} style={StyleSheet.absoluteFill} />

        <View style={[styles.headerInner, { paddingTop: HEADER_TOP + 10 }]}>
          <Animated.View
            style={{
              opacity: headerContentOpacity,
              transform: [{ translateY: headerContentTranslate }],
            }}
          >
            <View style={styles.headerTopRow}>
              <View>
                <Text style={[styles.logo, { fontSize: H1 }]}>Vera</Text>
                <Text style={[styles.tagline, { fontSize: H2 }]}>Trusted deals near you</Text>
              </View>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => navigation.navigate("Account")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.headerIcon}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Search stays visible even when collapsed */}
          <View style={styles.searchWrap}>
            <TextInput
              ref={searchInputRef}
              value={search}
              onChangeText={setSearch}
              placeholder="Search iPhones, PS5, MacBooks…"
              placeholderTextColor="#9aa0a6"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={styles.search}
            />
          </View>
        </View>
      </Animated.View>

      {/* SCROLLING LIST (starts below header; header never moves) */}
      <Animated.FlatList
        data={filteredAndSorted}
        renderItem={renderListing}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingTop: HEADER_MAX + 10, paddingBottom: bottomBarHeight + 14 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        ListHeaderComponent={ScrollHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Loading listings…</Text>
            </View>
          ) : (
            <Text style={styles.empty}>No listings yet. Post the first one!</Text>
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
      />

      {/* Floating Post Button (above bottom bar) */}
      <TouchableOpacity
        style={[styles.fab, { bottom: bottomBarHeight + 14 }]}
        onPress={() => navigation.navigate("VerificationGate", { nextRoute: "PostItem" })}
        activeOpacity={0.9}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Bottom Tab Bar (simple MVP) */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 0) }]}>
        <TabButton label="Home" icon="🏠" onPress={() => navigation.navigate("Home")} />
        <TabButton
          label="Search"
          icon="🔎"
          onPress={() => {
            // Keep you on Home; focus the search box
            try {
              searchInputRef.current?.focus?.();
            } catch {}
          }}
        />
        <TabButton
          label="Post"
          icon="➕"
          onPress={() => navigation.navigate("VerificationGate", { nextRoute: "PostItem" })}
          primary
        />
        <TabButton label="Chat" icon="💬" onPress={() => navigation.navigate("Chat")} />
        <TabButton label="Account" icon="👤" onPress={() => navigation.navigate("Account")} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({ label, icon, onPress, primary }) {
  return (
    <TouchableOpacity style={[styles.tabBtn, primary && styles.tabBtnPrimary]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.tabIcon, primary && styles.tabIconPrimary]}>{icon}</Text>
      <Text style={[styles.tabLabel, primary && styles.tabLabelPrimary]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },

  fixedHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 50,
    overflow: "hidden",
  },
  headerInner: {
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  logo: { fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  tagline: { color: "rgba(255,255,255,0.92)", marginTop: 2, fontWeight: "600" },

  headerIconButton: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerIcon: { fontSize: 18 },

  searchWrap: { marginTop: 10 },
  search: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    fontSize: 16,
  },

  scrollHeaderWrap: {
    backgroundColor: "#f7f8fa",
    paddingTop: 10,
  },

  chipsRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 10,
    alignItems: "center",
  },
  chip: {
    backgroundColor: "#eceef4",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  chipActive: { backgroundColor: "#635BFF" },
  chipText: { color: "#30323a", fontWeight: "700" },
  chipTextActive: { color: "#fff" },

  filtersRow: {
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sortRow: { flexDirection: "row", gap: 8 },

  filterPill: {
    backgroundColor: "#eceef4",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  filterPillActive: { backgroundColor: "#635BFF" },
  filterText: { color: "#30323a", fontWeight: "800", fontSize: 13 },
  filterTextActive: { color: "#fff" },

  sectionRow: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  sectionHint: { fontSize: 13, color: "#6b7280", fontWeight: "700" },

  errorBox: {
    marginHorizontal: 12,
    marginTop: 6,
    backgroundColor: "#fff3f2",
    borderWidth: 1,
    borderColor: "#ffd6d2",
    padding: 10,
    borderRadius: 14,
  },
  errorText: { color: "#b42318", fontWeight: "800" },

  loadingWrap: { alignItems: "center", marginTop: 26 },
  loadingText: { marginTop: 10, color: "#6b7280", fontWeight: "700" },

  empty: { textAlign: "center", marginTop: 40, color: "#6b7280", fontSize: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginHorizontal: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  image: { height: 210, width: "100%", backgroundColor: "#e5e7eb" },
  info: { paddingHorizontal: 14, paddingVertical: 14 },

  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  escrowPill: {
    backgroundColor: "#635BFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  escrowText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  title: { fontSize: 17, fontWeight: "800", color: "#0f172a", flex: 1, lineHeight: 22 },
  price: { fontSize: 24, fontWeight: "900", color: "#635BFF", marginTop: 6 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  seller: { color: "#4b5563", fontWeight: "700", flex: 1 },
  verified: { color: "#00c389", fontWeight: "900" },
  unverified: { color: "#9aa0a6", fontWeight: "800" },

  location: { color: "#6b7280", marginTop: 6, fontWeight: "600" },

  fab: {
    position: "absolute",
    right: 18,
    backgroundColor: "#635BFF",
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 12,
  },
  fabText: { color: "#fff", fontSize: 34, marginTop: -2, fontWeight: "300" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopWidth: 1,
    borderTopColor: "#e6e8ef",
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabBtnPrimary: {
    transform: [{ translateY: -10 }],
  },
  tabIcon: { fontSize: 18 },
  tabIconPrimary: { fontSize: 22 },
  tabLabel: { marginTop: 3, fontSize: 11, fontWeight: "800", color: "#374151" },
  tabLabelPrimary: { color: "#111827" },
});
