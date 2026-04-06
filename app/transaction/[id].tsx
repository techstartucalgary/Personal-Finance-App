import React, { useCallback, useEffect, useState, useRef } from "react";
import { Alert, useColorScheme, Platform, ActivityIndicator, View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { AddTransactionModal, AddTransactionModalRef } from "@/components/AddTransactionModal";
import { listAccounts } from "@/utils/accounts";
import { listCategories } from "@/utils/categories";
import { listExpenses } from "@/utils/expenses";
import { getRecurringRules } from "@/utils/recurring";
import type { AccountRow, CategoryRow, ExpenseRow } from "@/components/AddTransactionModal";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TransactionEditScreen() {
  const { session } = useAuthContext();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { id, initialData } = useLocalSearchParams<{ id: string; initialData?: string }>();
  const userId = session?.user.id;
  const ui = useThemeUI();
  const modalRef = useRef<AddTransactionModalRef>(null);

  const [initialTransaction, setInitialTransaction] = useState<ExpenseRow | null>(() => {
    if (initialData) {
      try {
        return JSON.parse(decodeURIComponent(initialData));
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!initialTransaction);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [recurringRules, setRecurringRules] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!userId || !id) return;
    
    // If we already have the transaction from params, only fetch dependencies (faster)
    if (initialTransaction) {
      try {
        const [accs, cats, rules] = await Promise.all([
          listAccounts({ profile_id: userId }),
          listCategories({ profile_id: userId }),
          getRecurringRules({ profile_id: userId }),
        ]);
        setAccounts((accs as any[]) ?? []);
        setCategories((cats as any[]) ?? []);
        setRecurringRules((rules as any[]) ?? []);
      } catch (error) {
        console.error("Error loading transaction dependencies:", error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const [accs, cats, rules, expenses] = await Promise.all([
        listAccounts({ profile_id: userId }),
        listCategories({ profile_id: userId }),
        getRecurringRules({ profile_id: userId }),
        listExpenses({ profile_id: userId }),
      ]);
      setAccounts((accs as any[]) ?? []);
      setCategories((cats as any[]) ?? []);
      setRecurringRules((rules as any[]) ?? []);

      const match = (expenses as any[]).find((ex) => String(ex.id) === id);
      if (match) {
        setInitialTransaction(match);
      } else {
        Alert.alert("Error", "Transaction not found");
        router.back();
      }
    } catch (error) {
      console.error("Error loading transaction edit data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, id, router, initialTransaction]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = useCallback(async () => {
    if (modalRef.current) {
      try {
        await modalRef.current.submit();
        // The modal component handles its own success alerts and such, 
        // but we might need to close the screen here if it doesn't.
        // Actually, updateTransaction normally calls onClose.
      } catch (err) {
        console.error("Save failed:", err);
      }
    }
  }, []);

  useEffect(() => {
    navigation.setOptions({
      title: "Edit Transaction",
      headerBackButtonDisplayMode: "minimal",
      headerTransparent: true,
      headerShadowVisible: false,
      headerTitleStyle: { color: ui.text },
      headerTintColor: ui.accent,
      headerRight: () => (
        <Pressable
          onPress={handleSave}
          hitSlop={20}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            width: 44,
            height: 44,
            justifyContent: "center",
            alignItems: "center",
            marginRight: Platform.OS === "ios" ? -10 : 0,
          })}
        >
          <IconSymbol name="checkmark" size={24} color={ui.accent} />
        </Pressable>
      ),
    });
  }, [navigation, handleSave, ui.accent, ui.text, ui.bg]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: ui.bg }}>
        <ActivityIndicator size="large" color={ui.accent} />
      </View>
    );
  }

  return (
    <AddTransactionModal
      ref={modalRef}
      visible={true}
      isSheet={false} // Full page
      hideHeader={true} // Use native header instead
      onClose={() => router.back()}
      accounts={accounts}
      categories={categories}
      onRefresh={loadData} // Or onRefresh
      ui={ui}
      isDark={isDark}
      userId={userId}
      mode="edit"
      initialTransaction={initialTransaction}
      recurringRules={recurringRules}
    />
  );
}
