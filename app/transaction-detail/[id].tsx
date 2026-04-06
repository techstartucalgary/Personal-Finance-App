import React, { useCallback, useEffect, useState } from "react";
import { Alert, View, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import { getPlaidTransactions, type PlaidTransaction } from "@/utils/plaid";

export default function PlaidTransactionDetailScreen() {
  const { session } = useAuthContext();
  const router = useRouter();
  const navigation = useNavigation();
  const { id, initialData } = useLocalSearchParams<{ id: string; initialData?: string }>();
  const userId = session?.user.id;
  const ui = useThemeUI();

  const [transaction, setTransaction] = useState<PlaidTransaction | null>(() => {
    if (initialData) {
      try {
        return JSON.parse(decodeURIComponent(initialData));
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!transaction);

  const loadData = useCallback(async () => {
    if (!userId || !id || transaction) {
      if (transaction) setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const transactions = await getPlaidTransactions();
      const match = (transactions as PlaidTransaction[]).find((tx) => tx.transaction_id === id);
      if (match) {
        setTransaction(match);
      } else {
        Alert.alert("Error", "Transaction not found");
        router.back();
      }
    } catch (error) {
      console.error("Error loading plaid transaction detail:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, id, router, transaction]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    navigation.setOptions({
      title: "Transaction Details",
      headerBackButtonDisplayMode: "minimal",
      headerTransparent: true,
      headerShadowVisible: false,
      headerTitleStyle: { color: ui.text },
      headerTintColor: ui.accent,
    });
  }, [navigation, ui.accent, ui.text, ui.bg]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: ui.bg }}>
        <ActivityIndicator size="large" color={ui.accent} />
      </View>
    );
  }

  return (
    <TransactionDetailModal
      visible={true}
      isSheet={false} // Full page
      hideHeader={true} // Use native header instead
      onClose={() => router.back()}
      transaction={transaction}
    />
  );
}
