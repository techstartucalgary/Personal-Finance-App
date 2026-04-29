import type { AccountRow, CategoryRow } from "@/components/AddTransactionModal";
import {
  AddTransactionModal,
  AddTransactionModalRef,
} from "@/components/AddTransactionModal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { listAccounts } from "@/utils/accounts";
import { listCategories } from "@/utils/categories";
import { getRecurringRules } from "@/utils/recurring";
import { usePreventRemove } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  View,
} from "react-native";

export default function TransactionAddScreen() {
  const { session } = useAuthContext();
  const router = useRouter();
  const navigation = useNavigation();
  const userId = session?.user.id;
  const { currentAccountId, initialDescription, goalId } = useLocalSearchParams<{
    currentAccountId?: string;
    initialDescription?: string;
    goalId?: string;
  }>();
  const ui = useThemeUI();
  const isDark = ui.bg === "#000000";
  const modalRef = useRef<AddTransactionModalRef>(null);
  const sheetUi = useMemo(() => ui, [ui]);

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [recurringRules, setRecurringRules] = useState<any[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [allowRemoval, setAllowRemoval] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = useCallback(async () => {
    if (!modalRef.current || !isValid) return;
    try {
      setAllowRemoval(true);
      await modalRef.current.submit();
    } catch (error) {
      setAllowRemoval(false);
      console.error("Save failed:", error);
    }
  }, [isValid]);

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
      title: goalId ? "Add Allocation" : "Add Transaction",
      headerBackVisible: false,
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : sheetUi.bg,
      },
      headerTitleStyle: { color: sheetUi.text },
      headerTintColor: sheetUi.accent,
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => ({
            minWidth: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <IconSymbol name="xmark" size={22} color={sheetUi.text} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={handleSave}
          disabled={!isValid}
          hitSlop={10}
          style={({ pressed }) => ({
            minWidth: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            opacity: !isValid ? 0.35 : pressed ? 0.55 : 1,
          })}
        >
          <IconSymbol name="checkmark" size={22} color={sheetUi.accent} />
        </Pressable>
      ),
    });
  }, [
    goalId,
    handleSave,
    navigation,
    router,
    sheetUi.accent,
    sheetUi.bg,
    sheetUi.text,
    isValid,
  ]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: sheetUi.bg,
        }}
      >
        <ActivityIndicator size="large" color={sheetUi.accent} />
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
      ui={sheetUi}
      isDark={isDark}
      userId={userId}
      mode="add"
      initialAccountId={currentAccountId ? Number(currentAccountId) : null}
      initialDescription={initialDescription ?? null}
      goalId={goalId ?? null}
      recurringRules={recurringRules}
      onStateChange={(state) => {
        setIsDirty(state.isDirty);
        setIsValid(state.isValid);
      }}
      onOpenAccountPicker={(currentAccountId) =>
        router.push({
          pathname: "/transaction-add/account-select",
          params: currentAccountId ? { currentAccountId: String(currentAccountId) } : {},
        })
      }
    />
  );
}
