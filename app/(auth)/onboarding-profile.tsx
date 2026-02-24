import { AuthButton } from "@/components/auth_buttons/auth-button";
import { InputField } from "@/components/auth_buttons/input-field";
import { Tokens, getColors } from "@/constants/authTokens";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type GoalId = "debt" | "big_purchase" | "net_worth" | "spending" | "invest";

type GoalOption = {
  id: GoalId;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
};

export default function OnboardingProfile() {
  const C = getColors("light");
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height < 760;
  const horizontalPad = compact ? 20 : 26;
  const topPadding = (compact ? 0 : 4) + insets.top;
  const bottomPad = 0;
  const hintTop = compact ? 6 : 8;

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
      const ImagePicker = await import("expo-image-picker");
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
      Alert.alert(
        "Photo pick unavailable",
        "Update Expo Go to the latest version or use a dev build to enable photo access."
      );
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
    <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar style="dark" backgroundColor={C.bg} />
      <View style={[styles.screen, { backgroundColor: C.bg }]}>
        <View
          style={[
            styles.container,
            {
              paddingTop: topPadding,
              paddingBottom: bottomPad,
              paddingHorizontal: horizontalPad,
            },
          ]}
        >
          <Text style={[styles.progressText, { color: C.text }]}>
            Setting Up 1/3
          </Text>

          <View style={styles.headerRow}>
            <Pressable
              onPress={onBack}
              hitSlop={10}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            >
              <Feather name="arrow-left" size={22} color={C.text} />
            </Pressable>

            <Text style={[styles.headerTitle, { color: C.text }]}>Setting up</Text>
            <View style={{ width: 34 }} />
          </View>

          <View style={[styles.divider, { backgroundColor: C.line }]} />

          <KeyboardAvoidingView
            style={styles.content}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={topPadding + 12}
          >
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.topBody, { color: C.muted }]}>
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
                      <Feather name="user" size={26} color={C.text} />
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
                    <Text style={[styles.smallActionText, { color: C.text }]}>
                      {photoUri ? "Change photo" : "Add photo"}
                    </Text>
                  </Pressable>

                  {photoUri ? (
                    <Pressable
                      onPress={removePhoto}
                      style={({ pressed }) => [
                        styles.smallActionBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.smallActionText,
                          { color: C.text, opacity: 0.65 },
                        ]}
                      >
                        Remove
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <View style={styles.formBlock}>
                <Text style={[styles.label, { color: C.text }]}>Preferred name</Text>
                <InputField
                  value={preferredName}
                  onChangeText={setPreferredName}
                  placeholder="e.g., Johnny"
                  forceScheme="light"
                  inputStyle={styles.inputText}
                  containerStyle={[styles.inputBox, { borderColor: C.chipBorder }]}
                />

                <Text style={[styles.label, { color: C.text, marginTop: 12 }]}>
                  Username
                </Text>
                <InputField
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g., JohnD300"
                  forceScheme="light"
                  inputStyle={styles.inputText}
                  containerStyle={[styles.inputBox, { borderColor: C.chipBorder }]}
                  inputProps={{ autoCapitalize: "none" }}
                />

                {normalizedUsername !== cleanedUsername.toLowerCase() &&
                cleanedUsername.length > 0 ? (
                  <Text style={[styles.hint, { color: C.muted, marginTop: hintTop }]}>
                    Will be saved as{" "}
                    <Text style={[styles.mono, { color: C.text }]}>
                      @{normalizedUsername}
                    </Text>
                  </Text>
                ) : null}

                <Text style={[styles.hint, { color: C.muted, marginTop: hintTop }]}>
                  Username must be at least 3 characters. Letters, numbers, and
                  underscores only.
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { color: C.text }]}>
                Primary goal
              </Text>
              <Text style={[styles.sectionBody, { color: C.muted }]}>
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
                        { borderColor: C.chipBorder, backgroundColor: "#E1E1E1" },
                        selected && styles.goalCardSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.goalIcon}>
                        <Feather name={g.icon} size={18} color={C.text} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.goalTitle, { color: C.text }]}>
                          {g.title}
                        </Text>
                        <Text style={[styles.goalSubtitle, { color: C.muted }]}>
                          {g.subtitle}
                        </Text>
                      </View>
                      {selected ? (
                        <Feather name="check" size={18} color={C.text} />
                      ) : (
                        <View style={styles.goalCheckGhost} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={[styles.footer, { backgroundColor: C.bg }]}>
            <AuthButton
              label="Next"
              variant="primary"
              onPress={onContinue}
              disabled={!canContinue}
              style={styles.cta}
              labelStyle={styles.ctaText}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const T = Tokens;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },

  progressText: {
    fontFamily: T.font.semiFamily ?? T.font.family,
    fontSize: 13,
    letterSpacing: 0.4,
    marginBottom: 12,
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
  headerTitle: {
    fontFamily: T.font.boldFamily ?? T.font.headingFamily,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  divider: {
    height: 2,
    opacity: 0.2,
    marginBottom: 8,
  },

  content: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 10, paddingBottom: 140 },

  topBody: {
    fontFamily: T.font.family,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 18,
    marginBottom: 14,
  },

  photoBlock: { alignItems: "center", marginBottom: 12 },
  photoCircle: {
    width: 96,
    height: 96,
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
    opacity: 0.8,
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
  smallActionText: {
    fontFamily: T.font.semiFamily ?? T.font.family,
    fontSize: 13,
  },

  formBlock: {
    marginTop: 4,
  },

  label: {
    fontFamily: T.font.semiFamily ?? T.font.family,
    fontSize: 14,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  inputBox: {
    backgroundColor: "#E1E1E1",
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 10,
  },
  inputText: {
    fontFamily: T.font.family,
    fontSize: 15.5,
    paddingVertical: 8,
  },
  hint: {
    fontFamily: T.font.family,
    fontSize: 12.5,
    lineHeight: 17,
  },
  mono: {
    fontFamily: T.font.semiFamily ?? T.font.family,
  },

  sectionTitle: {
    marginTop: 16,
    fontFamily: T.font.boldFamily ?? T.font.headingFamily,
    fontSize: 16,
    letterSpacing: -0.2,
    textAlign: "center",
  },
  sectionBody: {
    marginTop: 6,
    fontFamily: T.font.family,
    fontSize: 14.5,
    lineHeight: 20,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  goalCardSelected: {
    borderColor: "#111",
    backgroundColor: "#E8E8EA",
  },
  goalIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(17,17,17,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  goalTitle: { fontFamily: T.font.boldFamily ?? T.font.headingFamily, fontSize: 14 },
  goalSubtitle: { fontFamily: T.font.family, fontSize: 12, marginTop: 2 },
  goalCheckGhost: { width: 18, height: 18, borderRadius: 9, opacity: 0 },

  footer: {
    paddingTop: 10,
    paddingBottom: 6,
  },
  cta: {
    height: 50,
  },
  ctaText: {
    fontSize: 18,
    letterSpacing: 0.6,
  },

  pressed: { opacity: 0.6 },
});
