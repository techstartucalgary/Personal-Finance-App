import React, { useCallback, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import { listAccounts } from "@/utils/accounts";
import { listCategories } from "@/utils/categories";
import { getRecurringRules } from "@/utils/recurring";
import type { AccountRow, CategoryRow } from "@/components/AddTransactionModal";

export default function TransactionAddScreen() {
  const { session } = useAuthContext();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const userId = session?.user.id;
  const ui = useThemeUI();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [recurringRules, setRecurringRules] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!userId) return;
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
      console.error("Error loading transaction add data:", error);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <AddTransactionModal
      visible={true}
      isSheet={true}
      onClose={() => router.back()}
      accounts={accounts}
      categories={categories}
      onRefresh={loadData}
      ui={ui}
      isDark={isDark}
      userId={userId}
      mode="add"
      recurringRules={recurringRules}
    />
  );
}
