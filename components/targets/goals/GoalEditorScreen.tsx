import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

import { usePreventRemove } from "@react-navigation/native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Tokens } from "@/constants/authTokens";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import { createGoal, deleteGoal, editGoal, getGoal } from "@/utils/goals";
import { listAccounts } from "@/utils/accounts";
import { getPlaidAccounts } from "@/utils/plaid";

import {
  consumePendingGoalAccountSelection,
} from "./pending-goal-account-selection";
import type { GoalRow, GoalSelectableAccount } from "./types";
import {
  buildSelectableAccounts,
  formatLongDate,
  formatMoney,
  getGoalLinkedAccountName,
  getGoalRowSelectionKey,
  getGoalSelectionKey,
  normalizeGoal,
} from "./utils";

type GoalEditorScreenProps = {
  mode: "add" | "edit";
};

type GoalDraft = {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string | null;
  selectedAccountKey: string | null;
};

function serializeDraft(draft: GoalDraft) {
  return JSON.stringify(draft);
}

export function GoalEditorScreen({ mode }: GoalEditorScreenProps) {
  const { session } = useAuthContext();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const baseUi = useThemeUI();
  const ui = useMemo(() => {
    if (!isDark) return baseUi;
    return {
      ...baseUi,
      bg: "#1B1B1E",
      surface: "#2C2C2F",
      surface2: "#2C2C2F",
    };
  }, [baseUi, isDark]);
  const userId = session?.user.id;
  const { id, initialData } = useLocalSearchParams<{
    id?: string;
    initialData?: string;
  }>();

  const [accounts, setAccounts] = useState<GoalSelectableAccount[]>([]);
  const [goal, setGoal] = useState<GoalRow | null>(() => {
    if (mode !== "edit" || !initialData) return null;
    try {
      return normalizeGoal(JSON.parse(decodeURIComponent(initialData)));
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(mode === "edit" && !initialData);
  const [allowRemoval, setAllowRemoval] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] =
    useState<GoalSelectableAccount | null>(null);
  const initialDraftRef = useRef<string>(
    serializeDraft({
      name: "",
      targetAmount: "",
      currentAmount: "",
      targetDate: null,
      selectedAccountKey: null,
    }),
  );

  const hydrateFromGoal = useCallback(
    (nextGoal: GoalRow | null, selectableAccounts: GoalSelectableAccount[]) => {
      const selected =
        nextGoal == null
          ? null
          : selectableAccounts.find(
              (account) =>
                getGoalSelectionKey(account) === getGoalRowSelectionKey(nextGoal),
            ) ?? null;

      const nextDraft: GoalDraft = {
        name: nextGoal?.name ?? "",
        targetAmount:
          nextGoal?.target_amount != null && nextGoal.target_amount > 0
            ? String(nextGoal.target_amount)
            : "",
        currentAmount:
          nextGoal?.current_amount != null ? String(nextGoal.current_amount) : "",
        targetDate: nextGoal?.target_date ?? null,
        selectedAccountKey: getGoalSelectionKey(selected),
      };

      initialDraftRef.current = serializeDraft(nextDraft);
      setName(nextDraft.name);
      setTargetAmount(nextDraft.targetAmount);
      setCurrentAmount(nextDraft.currentAmount);
      setTargetDate(nextDraft.targetDate);
      setSelectedAccount(selected);
    },
    [],
  );

  const loadData = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const [manualAccounts, plaidAccounts, goalData] = await Promise.all([
        listAccounts({ profile_id: userId }),
        getPlaidAccounts(),
        mode === "edit" && id
          ? getGoal({ id, profile_id: userId })
          : Promise.resolve(goal),
      ]);

      const selectableAccounts = buildSelectableAccounts({
        manualAccounts: (manualAccounts as any[]) ?? [],
        plaidAccounts,
      });

      const normalizedGoal =
        goalData && mode === "edit" ? normalizeGoal(goalData) : null;

      setAccounts(selectableAccounts);
      if (mode === "edit") {
        setGoal(normalizedGoal);
        hydrateFromGoal(normalizedGoal, selectableAccounts);
      } else {
        initialDraftRef.current = serializeDraft({
          name: "",
          targetAmount: "",
          currentAmount: "",
          targetDate: null,
          selectedAccountKey: null,
        });
      }
    } catch (error) {
      console.error("Error loading goal editor data:", error);
      Alert.alert("Error", "Could not load goal details.");
      if (mode === "edit") {
        router.back();
      }
    } finally {
      setIsLoading(false);
    }
  }, [goal, hydrateFromGoal, id, mode, router, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      const pendingSelection = consumePendingGoalAccountSelection();
      if (pendingSelection) {
        setSelectedAccount(pendingSelection);
      }
    }, []),
  );

  const currentDraft = useMemo<GoalDraft>(
    () => ({
      name: name.trim(),
      targetAmount: targetAmount.trim(),
      currentAmount: currentAmount.trim(),
      targetDate,
      selectedAccountKey: getGoalSelectionKey(selectedAccount),
    }),
    [currentAmount, name, selectedAccount, targetAmount, targetDate],
  );

  const isDirty = serializeDraft(currentDraft) !== initialDraftRef.current;
  const parsedTargetAmount = Number(targetAmount);
  const parsedCurrentAmount = currentAmount.trim() ? Number(currentAmount) : 0;
  const isValid =
    name.trim().length > 0 &&
    Number.isFinite(parsedTargetAmount) &&
    parsedTargetAmount > 0 &&
    Number.isFinite(parsedCurrentAmount) &&
    parsedCurrentAmount >= 0 &&
    selectedAccount != null;

  const progressPreview = useMemo(() => {
    if (!parsedTargetAmount || parsedTargetAmount <= 0) return 0;
    return Math.min((parsedCurrentAmount / parsedTargetAmount) * 100, 100);
  }, [parsedCurrentAmount, parsedTargetAmount]);

  const handleSave = useCallback(async () => {
    if (!userId || !selectedAccount || !isValid) return;

    try {
      setAllowRemoval(true);
      const payload = {
        name: name.trim(),
        target_amount: parsedTargetAmount,
        current_amount: parsedCurrentAmount,
        target_date: targetDate?.trim() ? targetDate : null,
        linked_account: selectedAccount.isPlaid
          ? null
          : Number(selectedAccount.id),
        linked_plaid_account: selectedAccount.isPlaid
          ? String(selectedAccount.id)
          : null,
      };

      if (mode === "edit" && id) {
        await editGoal({
          id,
          profile_id: userId,
          update: payload,
        });
      } else {
        await createGoal({
          profile_id: userId,
          ...payload,
        });
      }

      router.back();
    } catch (error) {
      setAllowRemoval(false);
      console.error("Error saving goal:", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error && "message" in error
            ? String((error as { message?: unknown }).message ?? "Could not save goal.")
            : "Could not save goal.";
      Alert.alert("Error saving goal", message);
    }
  }, [
    id,
    isValid,
    mode,
    name,
    parsedCurrentAmount,
    parsedTargetAmount,
    router,
    selectedAccount,
    targetDate,
    userId,
  ]);

  const handleDelete = useCallback(() => {
    if (mode !== "edit" || !id || !userId) return;

    Alert.alert("Delete goal?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setAllowRemoval(true);
            await deleteGoal({ id, profile_id: userId });
            router.back();
          } catch (error) {
            setAllowRemoval(false);
            console.error("Error deleting goal:", error);
            Alert.alert("Error", "Could not delete goal.");
          }
        },
      },
    ]);
  }, [id, mode, router, userId]);

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
    const canSave = mode === "edit" ? isDirty && isValid : isValid;

    navigation.setOptions({
      title: mode === "edit" ? "Edit Goal" : "Add Goal",
      headerBackVisible: false,
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : ui.bg,
      },
      headerTitleStyle: {
        color: ui.text,
        fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
      },
      headerTintColor: ui.accent,
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
          <IconSymbol name="xmark" size={22} color={ui.text} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          hitSlop={10}
          style={({ pressed }) => ({
            minWidth: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            opacity: !canSave ? 0.35 : pressed ? 0.55 : 1,
          })}
        >
          <IconSymbol name="checkmark" size={22} color={ui.accent} />
        </Pressable>
      ),
    });
  }, [handleSave, isDirty, isValid, mode, navigation, router, ui.accent, ui.bg, ui.text]);

  if (isLoading) {
    return (
      <View style={[styles.loaderWrap, { backgroundColor: ui.bg }]}>
        <ActivityIndicator size="large" color={ui.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: ui.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: Platform.OS === "android" ? 16 : 0 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.heroCard,
          { backgroundColor: ui.surface, borderColor: ui.border },
        ]}
      >
        <ThemedText style={[styles.goalNamePreview, { color: ui.text }]}>
          {name.trim() || "Goal Name"}
        </ThemedText>
        <ThemedText style={[styles.heroAmount, { color: ui.text }]}>
          {formatMoney(parsedCurrentAmount)}
        </ThemedText>
        <ThemedText style={[styles.heroMeta, { color: ui.mutedText }]}>
          {selectedAccount
            ? getGoalLinkedAccountName(
                {
                  id: "preview",
                  name: name.trim(),
                  target_amount: parsedTargetAmount || 0,
                  current_amount: parsedCurrentAmount,
                  target_date: targetDate,
                  linked_account: selectedAccount.isPlaid
                    ? null
                    : Number(selectedAccount.id),
                  linked_plaid_account: selectedAccount.isPlaid
                    ? String(selectedAccount.id)
                    : null,
                },
                accounts,
              )
            : "Link Account"}
        </ThemedText>
        <View style={styles.progressPreviewTrack}>
          <View
            style={[
              styles.progressPreviewFill,
              { width: `${Math.max(progressPreview, 6)}%`, backgroundColor: ui.accent },
            ]}
          />
        </View>
      </View>

      <View style={styles.formStack}>
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: ui.surface, borderColor: ui.border },
          ]}
        >
          <FieldLabel label="Goal Name" ui={ui} />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Summer Vacation"
            placeholderTextColor={ui.mutedText}
            style={[
              styles.input,
              {
                backgroundColor: ui.surface2,
                color: ui.text,
              },
            ]}
          />

          <FieldLabel
            label="Target Amount"
            value={formatMoney(parsedTargetAmount || 0)}
            ui={ui}
          />
          <TextInput
            value={targetAmount}
            onChangeText={setTargetAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={ui.mutedText}
            style={[
              styles.input,
              {
                backgroundColor: ui.surface2,
                color: ui.text,
              },
            ]}
          />

          <FieldLabel label="Current Saved" ui={ui} />
          <TextInput
            value={currentAmount}
            onChangeText={setCurrentAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={ui.mutedText}
            style={[
              styles.input,
              {
                backgroundColor: ui.surface2,
                color: ui.text,
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: ui.surface, borderColor: ui.border },
          ]}
        >
          <DateTimePickerField
            label="Target Date"
            value={parseLocalDate(targetDate)}
            onChange={(date) => setTargetDate(toLocalISOString(date))}
            ui={ui}
          />
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: ui.surface, borderColor: ui.border },
          ]}
        >
          <FieldLabel label="Linked Account" ui={ui} />
          <Pressable
            onPress={() => {
              const pathname =
                mode === "edit" && id
                  ? "/goal/[id]/account-select"
                  : "/goal-add/account-select";

              router.push({
                pathname,
                params: {
                  ...(mode === "edit" && id ? { id } : {}),
                  ...(selectedAccount
                    ? {
                        currentAccountKey:
                          getGoalSelectionKey(selectedAccount) ?? undefined,
                      }
                    : {}),
                },
              } as any);
            }}
            style={({ pressed }) => [
              styles.accountField,
              {
                backgroundColor: ui.surface2,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText style={{ color: ui.text, fontSize: 16 }}>
                {selectedAccount?.name ?? "Select an account"}
              </ThemedText>
              {selectedAccount ? (
                <ThemedText style={{ color: ui.mutedText, fontSize: 12 }}>
                  {selectedAccount.isPlaid
                    ? selectedAccount.institutionName ?? "Plaid account"
                    : selectedAccount.type ?? "Manual account"}
                </ThemedText>
              ) : null}
            </View>

            <IconSymbol name="chevron.right" size={16} color={ui.mutedText} />
          </Pressable>

          {mode === "edit" && goal?.created_at ? (
            <View style={styles.readOnlyRow}>
              <FieldLabel label="Started" ui={ui} />
              <ThemedText style={[styles.readOnlyValue, { color: ui.text }]}>
                {formatLongDate(goal.created_at)}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {mode === "edit" ? (
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                borderColor: ui.danger,
                backgroundColor: ui.surface,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <ThemedText
              style={[styles.deleteButtonText, { color: ui.danger }]}
            >
              Delete Goal
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function FieldLabel({
  label,
  value,
  ui,
}: {
  label: string;
  value?: string;
  ui: { text: string; mutedText: string };
}) {
  return (
    <View style={styles.fieldLabelRow}>
      <ThemedText style={[styles.fieldLabel, { color: ui.text }]}>
        {label}
      </ThemedText>
      {value ? (
        <ThemedText style={[styles.fieldValue, { color: ui.mutedText }]}>
          {value}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECECF1",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 18,
  },
  heroCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  goalNamePreview: {
    textAlign: "center",
    fontSize: 22,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    textDecorationLine: "underline",
  },
  heroAmount: {
    textAlign: "center",
    fontSize: 48,
    lineHeight: 52,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    fontVariant: ["tabular-nums"],
  },
  heroMeta: {
    textAlign: "center",
    fontSize: 15,
    fontFamily: Tokens.font.family,
  },
  progressPreviewTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#D8D8DE",
    overflow: "hidden",
    marginTop: 6,
  },
  progressPreviewFill: {
    height: "100%",
    borderRadius: 999,
  },
  formStack: {
    gap: 14,
  },
  sectionCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    padding: 14,
    gap: 10,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fieldLabel: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  fieldValue: {
    fontSize: 13,
    fontFamily: Tokens.font.family,
  },
  input: {
    minHeight: 54,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: Tokens.font.family,
  },
  accountField: {
    minHeight: 54,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  readOnlyRow: {
    marginTop: 6,
    gap: 8,
  },
  readOnlyValue: {
    fontSize: 16,
    fontFamily: Tokens.font.family,
  },
  deleteButton: {
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deleteButtonText: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
});
