import { ThemedText } from "@/components/themed-text";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { supabase } from "@/utils/supabase";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useLocalSearchParams } from "expo-router";

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  ui: ReturnType<typeof useThemeUI>;
};

function ActionButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  ui,
}: ActionButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isPrimary
          ? { backgroundColor: ui.text, borderColor: ui.text }
          : { backgroundColor: ui.surface2, borderColor: ui.border },
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text
        style={[styles.buttonLabel, { color: isPrimary ? ui.bg : ui.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function ChangePasswordVerifyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ui = useThemeUI();
  const { session } = useAuthContext();
  const headerHeight = useHeaderHeight();

  const { currentPassword, nextPassword } = useLocalSearchParams<{
    currentPassword: string;
    nextPassword: string;
  }>();

  const [nonce, setNonce] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async () => {
    if (loading) return;

    const trimmedNonce = nonce.trim();
    if (!trimmedNonce || trimmedNonce.length < 6) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        current_password: currentPassword,
        password: nextPassword,
        nonce: trimmedNonce,
      });

      if (updateError) {
        if (
          updateError.message.toLowerCase().includes("nonce") ||
          updateError.message.toLowerCase().includes("otp") ||
          updateError.message.toLowerCase().includes("invalid")
        ) {
          setError("Invalid or expired code. Please try again.");
        } else {
          Alert.alert("Could not update password", updateError.message);
        }
        return;
      }

      Alert.alert(
        "Password updated",
        "Your password has been successfully changed.",
        [{ text: "OK", onPress: () => router.navigate("/settings") }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendNonce = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const { error: resendError } = await supabase.auth.reauthenticate();
      if (resendError) {
        Alert.alert("Could not resend code", resendError.message);
        return;
      }

      Alert.alert(
        "Code resent",
        "Check your email for a new verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  const topPadding = Platform.OS === "ios" ? headerHeight + 16 : 16;

  return (
    <View style={[styles.container, { backgroundColor: ui.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: ui.mutedText }]}>
            VERIFY
          </ThemedText>
          <View
            style={[
              styles.card,
              { backgroundColor: ui.surface, borderColor: ui.border },
            ]}
          >
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: ui.surface2 }]}>
                <Feather name="mail" size={18} color={ui.accent} />
              </View>
              <View style={styles.infoCopy}>
                <ThemedText type="defaultSemiBold">Check your email</ThemedText>
                <ThemedText style={[styles.helperText, { color: ui.mutedText }]}>
                  We sent a 6-digit code to {session?.user?.email}. Enter it
                  below to confirm your password change.
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: ui.mutedText }]}>
            CODE
          </ThemedText>
          <View
            style={[
              styles.card,
              styles.formCard,
              { backgroundColor: ui.surface, borderColor: ui.border },
            ]}
          >
            <View style={styles.fieldBlock}>
              <ThemedText style={[styles.fieldLabel, { color: ui.mutedText }]}>
                Verification Code
              </ThemedText>
              <View
                style={[
                  styles.inputShell,
                  styles.codeShell,
                  {
                    backgroundColor: ui.surface2,
                    borderColor: error ? "#EF4444" : ui.border,
                  },
                ]}
              >
                <TextInput
                  value={nonce}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, "").slice(0, 6);
                    setNonce(digits);
                    if (error) setError(undefined);
                  }}
                  placeholder="000000"
                  placeholderTextColor={ui.mutedText}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  textContentType="oneTimeCode"
                  style={[styles.input, styles.codeInput, { color: ui.text }]}
                />
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          </View>
        </View>

        <View style={styles.buttonGroup}>
          <ActionButton
            label={loading ? "Updating..." : "Update Password"}
            onPress={handleSubmit}
            disabled={loading || nonce.trim().length < 6}
            ui={ui}
          />
          <ActionButton
            label={loading ? "Sending..." : "Resend Code"}
            onPress={handleResendNonce}
            disabled={loading}
            variant="secondary"
            ui={ui}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginLeft: 12,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  formCard: {
    padding: 16,
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  infoCopy: {
    flex: 1,
    gap: 4,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  inputShell: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  codeShell: {
    justifyContent: "center",
  },
  codeInput: {
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 24,
    fontWeight: "600",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginLeft: 4,
  },
  buttonGroup: {
    gap: 10,
  },
  button: {
    height: 50,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
