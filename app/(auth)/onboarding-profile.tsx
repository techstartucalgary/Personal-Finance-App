import React, { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Image,
  Platform,
  Alert,
  ScrollView,
} from "react-native";

type GoalId = "debt" | "big_purchase" | "net_worth" | "spending" | "invest";

type GoalOption = {
  id: GoalId;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
};

export default function OnboardingProfile() {
  const params = useLocalSearchParams<{ needsEmailConfirm?: string }>();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [preferredName, setPreferredName] = useState("");
  const [username, setUsername] = useState("");
  const [goal, setGoal] = useState<GoalId | null>(null);

  const goals: GoalOption[] = useMemo(
    () => [
      {
        id: "debt",
        title: "Pay down debt",
        subtitle: "Reduce balances faster",
        icon: "credit-card",
      },
      {
        id: "big_purchase",
        title: "Save for something big",
        subtitle: "House, car, trip, tuition",
        icon: "target",
      },
      {
        id: "net_worth",
        title: "Build net worth",
        subtitle: "Track assets vs liabilities",
        icon: "trending-up",
      },
      {
        id: "spending",
        title: "Control spending",
        subtitle: "Stay on top of day-to-day",
        icon: "activity",
      },
      {
        id: "invest",
        title: "Invest for the future",
        subtitle: "Long-term progress tracking",
        icon: "pie-chart",
      },
    ],
    []
  );

  const cleanedPreferredName = preferredName.trim();
  const cleanedUsername = username.trim();

  const normalizedUsername = cleanedUsername
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");

  const canContinue =
    cleanedPreferredName.length > 0 &&
    normalizedUsername.length >= 3 &&
    goal !== null;

  const onBack = () => router.back();

  const pickPhoto = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission needed",
            "Allow photo library access to pick a profile picture."
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (uri) setPhotoUri(uri);
    } catch (e) {
      console.log(e);
      Alert.alert("Photo pick failed", "Please try again.");
    }
  };

  const removePhoto = () => setPhotoUri(null);

  const onContinue = () => {
    if (!canContinue) return;

    const needsEmailConfirm = params.needsEmailConfirm === "1" ? "1" : "0";

    router.push({
      pathname: "/(auth)/onboarding-currency",
      params: { needsEmailConfirm },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.shell}>
          {/* Header stays above scroll */}
          <Text style={styles.progressText}>Setting Up 1/3</Text>

          <View style={styles.headerRow}>
            <Pressable
              onPress={onBack}
              hitSlop={10}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            >
              <Feather name="arrow-left" size={22} color="#111" />
            </Pressable>

            <Text style={styles.headerTitle}>Setting up</Text>
            <View style={{ width: 34 }} />
          </View>

          <View style={styles.divider} />

          {/* Scrollable content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.topBody}>
              Add a profile so your settings sync cleanly across devices.
            </Text>

            <View style={styles.photoBlock}>
              <Pressable
                onPress={pickPhoto}
                style={({ pressed }) => [
                  styles.photoCircle,
                  pressed && styles.pressed,
                ]}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoImg} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Feather name="user" size={26} color="#111" />
                  </View>
                )}
              </Pressable>

              <View style={styles.photoActions}>
                <Pressable
                  onPress={pickPhoto}
                  style={({ pressed }) => [
                    styles.smallActionBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.smallActionText}>
                    {photoUri ? "Change photo" : "Add photo"}
                  </Text>
                </Pressable>

                {photoUri && (
                  <Pressable
                    onPress={removePhoto}
                    style={({ pressed }) => [
                      styles.smallActionBtn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.smallActionText, { opacity: 0.65 }]}>
                      Remove
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Preferred name</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={preferredName}
                  onChangeText={setPreferredName}
                  placeholder="e.g., Johnny"
                  placeholderTextColor="rgba(17,17,17,0.45)"
                  style={styles.input}
                  returnKeyType="next"
                />
              </View>

              <Text style={[styles.label, { marginTop: 12 }]}>Username</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g., JohnD300"
                  placeholderTextColor="rgba(17,17,17,0.45)"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              {normalizedUsername !== cleanedUsername.toLowerCase() &&
                cleanedUsername.length > 0 && (
                  <Text style={styles.hint}>
                    Will be saved as:{" "}
                    <Text style={styles.mono}>@{normalizedUsername}</Text>
                  </Text>
                )}

              <Text style={[styles.hint, { marginTop: 6 }]}>
                Username must be at least 3 characters. Letters, numbers, and
                underscores only.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Primary goal</Text>
            <Text style={styles.sectionBody}>
              Pick one to personalize your setup.
            </Text>

            <View style={styles.goalGrid}>
              {goals.map((g) => {
                const selected = goal === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setGoal(g.id)}
                    style={({ pressed }) => [
                      styles.goalCard,
                      selected && styles.goalCardSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.goalIcon}>
                      <Feather name={g.icon} size={18} color="#111" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalTitle}>{g.title}</Text>
                      <Text style={styles.goalSubtitle}>{g.subtitle}</Text>
                    </View>
                    {selected ? (
                      <Feather name="check" size={18} color="#111" />
                    ) : (
                      <View style={styles.goalCheckGhost} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Spacer so last goal isn’t hidden behind footer */}
            <View style={{ height: 110 }} />
          </ScrollView>

          {/* Fixed footer CTA */}
          <View style={styles.footer}>
            <Pressable
              onPress={onContinue}
              disabled={!canContinue}
              style={({ pressed }) => [
                styles.cta,
                !canContinue && styles.ctaDisabled,
                pressed && canContinue && styles.ctaPressed,
              ]}
            >
              <Text style={styles.ctaText}>NEXT</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F5F7" },
  screen: {
    flex: 1,
    backgroundColor: "#F4F5F7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  shell: { width: "100%", maxWidth: 520, flex: 1 },

  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2B2B2B",
    marginBottom: 10,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  divider: {
    height: 2,
    backgroundColor: "#111",
    opacity: 0.25,
    marginBottom: 6,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 10 },

  topBody: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    color: "#111",
    opacity: 0.6,
    paddingHorizontal: 18,
    marginBottom: 12,
  },

  photoBlock: { alignItems: "center", marginBottom: 10 },
  photoCircle: {
    width: 92,
    height: 92,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(17,17,17,0.35)",
    overflow: "hidden",
    backgroundColor: "#F7F7F7",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
  },
  photoImg: { width: "100%", height: "100%" },

  photoActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  smallActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  smallActionText: { fontSize: 12, fontWeight: "700", color: "#111" },

  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111",
    opacity: 0.75,
    marginBottom: 6,
  },
  inputWrap: {
    borderWidth: 1.25,
    borderColor: "#B8B8B8",
    borderRadius: 8,
    backgroundColor: "#F6F6F6",
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  input: { fontSize: 13, color: "#111", paddingVertical: 10 },
  hint: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 14,
    color: "#111",
    opacity: 0.55,
    textAlign: "center",
  },
  mono: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },

  sectionTitle: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },
  sectionBody: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    color: "#111",
    opacity: 0.6,
    textAlign: "center",
    paddingHorizontal: 18,
    marginBottom: 12,
  },

  goalGrid: { gap: 10, paddingHorizontal: 2 },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.25,
    borderColor: "#B8B8B8",
    borderRadius: 10,
    backgroundColor: "#F6F6F6",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  goalCardSelected: {
    borderColor: "#111",
    backgroundColor: "#F2F2F2",
  },
  goalIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(17,17,17,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  goalTitle: { fontSize: 13, fontWeight: "800", color: "#111" },
  goalSubtitle: { fontSize: 11, color: "#111", opacity: 0.6, marginTop: 2 },
  goalCheckGhost: { width: 18, height: 18, borderRadius: 9, opacity: 0 },

  footer: {
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: "#F4F5F7",
  },
  cta: {
    backgroundColor: "#111",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaDisabled: { backgroundColor: "#111", opacity: 0.55 },
  ctaPressed: { opacity: 0.85 },
  ctaText: {
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: 0.6,
    fontSize: 12,
  },

  pressed: { opacity: 0.6 },
});
