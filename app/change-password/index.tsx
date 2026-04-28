import { ThemedText } from "@/components/themed-text";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { supabase } from "@/utils/supabase";
import Feather from "@expo/vector-icons/Feather";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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

type FormErrors = {
  currentPassword?: string;
  nextPassword?: string;
  confirmPassword?: string;
};

function getPasswordError(password: string) {
  if (!password) return "Please enter a new password.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/\d/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one symbol.";
  }

  return undefined;
}

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
  secureTextEntry: boolean;
  onToggleVisibility: () => void;
  ui: ReturnType<typeof useThemeUI>;
};

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  onToggleVisibility,
  ui,
}: PasswordFieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <ThemedText style={[styles.fieldLabel, { color: ui.mutedText }]}>
        {label}
      </ThemedText>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: ui.surface2,
            borderColor: error ? "#EF4444" : ui.border,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={ui.mutedText}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: ui.text }]}
        />
        <Pressable
          onPress={onToggleVisibility}
          hitSlop={10}
          style={styles.inputAccessory}
        >
          <Feather
            name={secureTextEntry ? "eye" : "eye-off"}
            size={18}
            color={ui.mutedText}
          />
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

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

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ui = useThemeUI();
  const { session } = useAuthContext();
  const headerHeight = useHeaderHeight();

  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNextPassword, setShowNextPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const providers = useMemo(() => {
    const providerList = session?.user?.app_metadata?.providers;
    if (Array.isArray(providerList)) return providerList as string[];

    const provider = session?.user?.app_metadata?.provider;
    return typeof provider === "string" ? [provider] : [];
  }, [session?.user?.app_metadata]);

  const hasEmailPasswordSignIn = providers.includes("email");

  const handleRequestNonce = async () => {
    if (loading) return;

    const email = session?.user?.email?.trim();
    const trimmedCurrentPassword = currentPassword.trim();
    const trimmedPassword = nextPassword.trim();
    const trimmedConfirm = confirmPassword.trim();
    const nextErrors: FormErrors = {};

    if (!email) {
      Alert.alert(
        "Could not verify current password",
        "We couldn't find an email address for this account."
      );
      return;
    }

    if (!trimmedCurrentPassword) {
      nextErrors.currentPassword = "Please enter your current password.";
    }

    const passwordError = getPasswordError(trimmedPassword);
    if (passwordError) {
      nextErrors.nextPassword = passwordError;
    }

    if (!trimmedConfirm) {
      nextErrors.confirmPassword = "Please confirm your new password.";
    } else if (trimmedConfirm !== trimmedPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const { error: verifyPasswordError } =
        await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });

      if (verifyPasswordError) {
        setErrors({
          currentPassword: "Current password is incorrect.",
        });
        return;
      }

      const { error } = await supabase.auth.reauthenticate();
      if (error) {
        Alert.alert("Could not send verification code", error.message);
        return;
      }

      router.push({
        pathname: "/change-password/verify",
        params: { currentPassword, nextPassword },
      });
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
        {!hasEmailPasswordSignIn ? (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: ui.mutedText }]}>
              SECURITY
            </ThemedText>
            <View
              style={[
                styles.card,
                { backgroundColor: ui.surface, borderColor: ui.border },
              ]}
            >
              <View style={styles.infoRow}>
                <View
                  style={[styles.iconBox, { backgroundColor: ui.surface2 }]}
                >
                  <Feather name="lock" size={18} color={ui.text} />
                </View>
                <View style={styles.infoCopy}>
                  <ThemedText type="defaultSemiBold">
                    Password sign-in not enabled
                  </ThemedText>
                  <ThemedText
                    style={[styles.helperText, { color: ui.mutedText }]}
                  >
                    This account uses Google sign-in, so there is no password to
                    change here.
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <ThemedText
                style={[styles.sectionTitle, { color: ui.mutedText }]}
              >
                SECURITY
              </ThemedText>
              <View
                style={[
                  styles.card,
                  { backgroundColor: ui.surface, borderColor: ui.border },
                ]}
              >
                <View style={styles.infoRow}>
                  <View
                    style={[styles.iconBox, { backgroundColor: ui.surface2 }]}
                  >
                    <Feather name="shield" size={18} color={ui.accent} />
                  </View>
                  <View style={styles.infoCopy}>
                    <ThemedText type="defaultSemiBold">
                      Confirm your identity
                    </ThemedText>
                    <ThemedText
                      style={[styles.helperText, { color: ui.mutedText }]}
                    >
                      Enter your current password, then choose a new one. We
                      will email a verification code before the change is saved.
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText
                style={[styles.sectionTitle, { color: ui.mutedText }]}
              >
                NEW PASSWORD
              </ThemedText>
              <View
                style={[
                  styles.card,
                  styles.formCard,
                  { backgroundColor: ui.surface, borderColor: ui.border },
                ]}
              >
                <PasswordField
                  label="Current Password"
                  value={currentPassword}
                  onChangeText={(text) => {
                    setCurrentPassword(text);
                    if (errors.currentPassword) {
                      setErrors((prev) => ({
                        ...prev,
                        currentPassword: undefined,
                      }));
                    }
                  }}
                  placeholder="Enter current password"
                  error={errors.currentPassword}
                  secureTextEntry={!showCurrentPassword}
                  onToggleVisibility={() =>
                    setShowCurrentPassword((value) => !value)
                  }
                  ui={ui}
                />

                <PasswordField
                  label="New Password"
                  value={nextPassword}
                  onChangeText={(text) => {
                    setNextPassword(text);
                    if (errors.nextPassword) {
                      setErrors((prev) => ({
                        ...prev,
                        nextPassword: undefined,
                      }));
                    }
                  }}
                  placeholder="Create new password"
                  error={errors.nextPassword}
                  secureTextEntry={!showNextPassword}
                  onToggleVisibility={() =>
                    setShowNextPassword((value) => !value)
                  }
                  ui={ui}
                />

                <PasswordField
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }));
                    }
                  }}
                  placeholder="Re-enter new password"
                  error={errors.confirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  onToggleVisibility={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  ui={ui}
                />

                <View
                  style={[
                    styles.requirementsBox,
                    { backgroundColor: ui.surface2, borderColor: ui.border },
                  ]}
                >
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.requirementsTitle}
                  >
                    Password requirements
                  </ThemedText>
                  <ThemedText
                    style={[styles.requirementText, { color: ui.mutedText }]}
                  >
                    At least 8 characters, with 1 lowercase letter, 1 uppercase
                    letter, 1 number, and 1 symbol.
                  </ThemedText>
                </View>
              </View>
            </View>

            <ActionButton
              label={loading ? "Sending Code..." : "Continue"}
              onPress={handleRequestNonce}
              disabled={loading}
              ui={ui}
            />
          </>
        )}
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
  inputAccessory: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  requirementsBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 6,
  },
  requirementsTitle: {
    fontSize: 14,
  },
  requirementText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginLeft: 4,
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
