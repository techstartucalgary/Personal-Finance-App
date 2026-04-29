import type { AccountRow, CategoryRow, ExpenseRow } from "@/components/AddTransactionModal";
import { AddTransactionModal, AddTransactionModalRef } from "@/components/AddTransactionModal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { getAccountById, listAccounts, updateAccount } from "@/utils/accounts";
import { listCategories } from "@/utils/categories";
import { deleteExpense, listExpenses } from "@/utils/expenses";
import {
  deleteGoalTransaction,
  extractGoalTransactionGoalId,
} from "@/utils/goal-transactions";
import { deleteRecurringRule, getRecurringRules } from "@/utils/recurring";
import { usePreventRemove } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, View } from "react-native";

export default function TransactionEditScreen() {
  const { session } = useAuthContext();
  const router = useRouter();
  const navigation = useNavigation();
  const isDark = false;
  const { id, initialData, goalId } = useLocalSearchParams<{
    id: string;
    initialData?: string;
    goalId?: string;
  }>();
  const userId = session?.user.id;
  const ui = useThemeUI();
  const modalRef = useRef<AddTransactionModalRef>(null);

  const [initialTransaction, setInitialTransaction] = useState<ExpenseRow | null>(() => {
    if (initialData) {
      try {
        return JSON.parse(decodeURIComponent(initialData));
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!initialTransaction);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [recurringRules, setRecurringRules] = useState<any[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [allowRemoval, setAllowRemoval] = useState(false);
  const isGoalTransaction =
    Boolean(goalId) ||
    Boolean(extractGoalTransactionGoalId(initialTransaction?.description));

  const loadData = useCallback(async () => {
    if (!userId || !id) return;

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
    if (!modalRef.current || !isValid) return;
    try {
      setAllowRemoval(true);
      await modalRef.current.submit();
    } catch (err) {
      setAllowRemoval(false);
      console.error("Save failed:", err);
    }
  }, [isValid]);

  const applyTransactionToBalance = useCallback(
    (account: AccountRow, transactionAmount: number) => {
      const currentBalance = account.balance ?? 0;
      const isCredit = account.account_type === "credit";
      return isCredit
        ? currentBalance + transactionAmount
        : currentBalance - transactionAmount;
    },
    [],
  );

  const handleDelete = useCallback(() => {
    if (!userId || !initialTransaction) return;

    const linkedGoalId = extractGoalTransactionGoalId(initialTransaction.description);
    const title = linkedGoalId ? "Delete allocation?" : "Delete transaction?";
    const message = linkedGoalId
      ? "This will remove the allocation from the goal. It will not change the account balance."
      : "This action cannot be undone.";

    const executeDelete = async () => {
      if (!userId || !initialTransaction) return;
      setIsLoading(true);
      try {
        const originalAmount = initialTransaction.amount ?? 0;
        const originalAccountId = initialTransaction.account_id;

        if (linkedGoalId) {
          await deleteGoalTransaction({
            id: initialTransaction.id,
            profile_id: userId,
            amount: originalAmount,
            description: initialTransaction.description,
          });
        } else {
          await deleteExpense({ id: initialTransaction.id, profile_id: userId });
        }

        if (!linkedGoalId && originalAccountId != null) {
          const originalAccount = await getAccountById({
            id: originalAccountId,
            profile_id: userId,
          });
          if (originalAccount) {
            const revertedBalance = applyTransactionToBalance(
              originalAccount as AccountRow,
              -originalAmount,
            );
            await updateAccount({
              id: String(originalAccount.id),
              profile_id: userId,
              update: { balance: revertedBalance },
            });
          }
        }

        setAllowRemoval(true);
        router.back();
      } catch (error) {
        console.error("Error deleting transaction:", error);
        Alert.alert("Error", linkedGoalId ? "Could not delete allocation." : "Could not delete transaction.");
        setIsLoading(false);
      }
    };

    if (!linkedGoalId && initialTransaction.recurring_rule_id) {
      Alert.alert(
        "Recurring Transaction",
        "This transaction is part of a recurring series. What would you like to do?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete and Cancel Future Recurring",
            style: "destructive",
            onPress: async () => {
              setIsLoading(true);
              try {
                await deleteRecurringRule({
                  id: initialTransaction.recurring_rule_id!,
                  profile_id: userId,
                });
                await executeDelete();
              } catch (error) {
                console.error("Error updating rule:", error);
                Alert.alert("Error", "Could not cancel future recurring transactions.");
                setIsLoading(false);
              }
            },
          },
          {
            text: "Delete This Transaction Only",
            style: "default",
            onPress: executeDelete,
          },
        ],
      );
      return;
    }

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: executeDelete,
      },
    ]);
  }, [applyTransactionToBalance, initialTransaction, router, userId]);

  usePreventRemove(isDirty && !allowRemoval, ({ data }) => {
    Alert.alert(
      "Discard changes?",
      "You have unsaved changes. Are you sure you want to leave this screen?",
      [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setAllowRemoval(true);
            requestAnimationFrame(() => {
              navigation.dispatch(data.action);
            });
          },
        },
      ],
    );
  });

  useEffect(() => {
    navigation.setOptions({
      title: isGoalTransaction ? "Edit Allocation" : "Edit Transaction",
      headerBackButtonDisplayMode: "minimal",
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : ui.bg,
      },
      headerTitleStyle: { color: ui.text },
      headerTintColor: ui.accent,
      headerRight: () => {
        const canSave = isDirty && isValid;
        return (
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            hitSlop={20}
            style={({ pressed }) => ({
              opacity: !canSave ? 0.35 : pressed ? 0.7 : 1,
              minWidth: 32,
              height: 32,
              justifyContent: "center",
              alignItems: "center",
            })}
          >
            <IconSymbol name="checkmark" size={24} color={ui.accent} />
          </Pressable>
        );
      },
    });
  }, [navigation, handleSave, ui.accent, ui.text, ui.bg, isDirty, isValid, isGoalTransaction]);

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
      isSheet={false}
      hideHeader={true}
      onClose={() => router.back()}
      accounts={accounts}
      categories={categories}
      onRefresh={loadData}
      ui={ui}
      isDark={isDark}
      userId={userId}
      mode="edit"
      initialTransaction={initialTransaction}
      goalId={goalId ?? null}
      recurringRules={recurringRules}
      onDeleteRequest={handleDelete}
      onStateChange={(state) => {
        setIsDirty(state.isDirty);
        setIsValid(state.isValid);
      }}
      onOpenAccountPicker={(currentAccountId) =>
        router.push({
          pathname: "/transaction/[id]/account-select",
          params: {
            id,
            ...(currentAccountId ? { currentAccountId: String(currentAccountId) } : {}),
          },
        })
      }
    />
  );
}
