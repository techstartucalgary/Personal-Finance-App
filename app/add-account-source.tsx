import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import {
  create as plaidCreate,
  destroy as plaidDestroy,
  open as plaidOpen,
  LinkExit,
  LinkSuccess,
} from "react-native-plaid-link-sdk";

import { ThemedText } from "@/components/themed-text";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { exchangePublicToken, getLinkToken } from "@/utils/plaid";
import { styles as tabStyles } from "@/components/accounts/tab/styles";

export default function AddAccountSourceScreen() {
  const router = useRouter();
  const ui = useThemeUI();
  const { session } = useAuthContext();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectBank = useCallback(async () => {
    try {
      setIsConnecting(true);
      const token = await getLinkToken();

      await plaidDestroy();

      plaidCreate({
        token,
        noLoadingState: false,
        onLoad: () => {
          plaidOpen({
            onSuccess: async (success: LinkSuccess) => {
              try {
                setIsConnecting(true);
                const institutionName = success.metadata?.institution?.name;
                await exchangePublicToken(
                  success.publicToken,
                  institutionName
                );
                Alert.alert(
                  "Success!",
                  `${institutionName || "Bank"} connected successfully.`
                );
                // Dismiss the modal stack after success
                router.dismissAll();
              } catch (err) {
                console.error("Error exchanging token:", err);
                Alert.alert(
                  "Connection Error",
                  "Bank connection failed. Please try again."
                );
              } finally {
                setIsConnecting(false);
              }
            },
            onExit: (exit: LinkExit) => {
              console.log("Plaid Link exited:", exit);
              setIsConnecting(false);
            },
          });
        },
      });
    } catch (err) {
      console.error("Error getting link token:", err);
      Alert.alert(
        "Connection Error",
        "Could not start bank connection. Please try again."
      );
      setIsConnecting(false);
    }
  }, [router]);

  return (
    <SelectionModal
      visible={true}
      isSheet={true}
      onClose={() => router.back()}
      title="Add Account"
      ui={ui}
    >
      <ThemedText
        style={{
          color: ui.mutedText,
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        How would you like to add your new account?
      </ThemedText>

      <Pressable
        style={[
          tabStyles.modalOption,
          {
            borderColor: ui.border,
            backgroundColor: ui.surface,
            flexDirection: "row",
            justifyContent: "flex-start",
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 12,
            borderWidth: StyleSheet.hairlineWidth,
          },
        ]}
        onPress={() => router.push("/add-account-manual")}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: ui.surface2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="edit-2" size={18} color={ui.text} />
        </View>
        <View>
          <ThemedText type="defaultSemiBold">Self-Managed Account</ThemedText>
          <ThemedText
            style={{ color: ui.mutedText, fontSize: 13, marginTop: 2 }}
          >
            Enter transactions yourself
          </ThemedText>
        </View>
      </Pressable>

      <Pressable
        style={[
          tabStyles.modalOption,
          {
            borderColor: ui.border,
            backgroundColor: ui.surface,
            flexDirection: "row",
            justifyContent: "flex-start",
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 12,
            borderWidth: StyleSheet.hairlineWidth,
          },
        ]}
        disabled={isConnecting}
        onPress={handleConnectBank}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: ui.accentSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isConnecting ? (
            <ActivityIndicator size="small" color={ui.accent} />
          ) : (
            <Feather name="link" size={18} color={ui.accent} />
          )}
        </View>
        <View>
          <ThemedText type="defaultSemiBold">
            {isConnecting ? "Connecting..." : "Connect Bank"}
          </ThemedText>
          <ThemedText
            style={{ color: ui.mutedText, fontSize: 13, marginTop: 2 }}
          >
            Sync automatically via Plaid
          </ThemedText>
        </View>
      </Pressable>
    </SelectionModal>
  );
}
