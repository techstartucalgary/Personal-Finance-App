import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { useFocusEffect, useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Tokens } from "@/constants/authTokens";
import { tabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import { listGoals } from "@/utils/goals";

import { GoalSegmentedControl } from "./goals/GoalSegmentedControl";
import type {
  GoalAccountCollections,
  GoalSegment,
  GoalSelectableAccount,
  GoalRow,
} from "./goals/types";
import {
  buildGoalActivity,
  buildSelectableAccounts,
  formatActivityDateLabel,
  formatMoney,
  formatShortDate,
  getDaysUntilTarget,
  getGoalDeadlineCopy,
  getGoalLinkedAccountName,
  getGoalProgress,
  isGoalReached,
  normalizeGoal,
} from "./goals/utils";

type GoalsViewProps = GoalAccountCollections & {
  filterAccountId?: string | number | null;
  refreshKey?: number;
  searchQuery?: string;
};

export function GoalsView({
  accounts,
  plaidAccounts,
  filterAccountId = null,
  refreshKey = 0,
  searchQuery = "",
}: GoalsViewProps) {
  const { session } = useAuthContext();
  const router = useRouter();
  const ui = tabsTheme.ui;
  const userId = session?.user.id;

  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<GoalSegment>("active");

  const selectableAccounts = useMemo<GoalSelectableAccount[]>(
    () =>
      buildSelectableAccounts({
        manualAccounts: accounts,
        plaidAccounts,
      }),
    [accounts, plaidAccounts],
  );

  const loadGoals = useCallback(
    async (silent = false) => {
      if (!userId) {
        setGoals([]);
        return;
      }

      if (!silent) setIsLoading(true);
      try {
        const data = await listGoals({ profile_id: userId });
        setGoals(((data as any[]) ?? []).map(normalizeGoal));
      } catch (error) {
        console.error("Error loading goals:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      loadGoals(true);
    }, [loadGoals]),
  );

  useEffect(() => {
    if (refreshKey > 0) {
      loadGoals(true);
    }
  }, [loadGoals, refreshKey]);

  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      const matchesAccount =
        filterAccountId == null ||
        goal.linked_account === filterAccountId ||
        goal.linked_plaid_account === filterAccountId;
      const matchesSearch =
        !searchQuery ||
        goal.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesAccount && matchesSearch;
    });
  }, [filterAccountId, goals, searchQuery]);

  const activityItems = useMemo(
    () => buildGoalActivity(filteredGoals),
    [filteredGoals],
  );

  const reachedGoals = useMemo(
    () =>
      filteredGoals
        .filter(isGoalReached)
        .sort((left, right) => {
          const rightTime = new Date(
            right.target_date || right.created_at || 0,
          ).getTime();
          const leftTime = new Date(
            left.target_date || left.created_at || 0,
          ).getTime();
          return rightTime - leftTime;
        }),
    [filteredGoals],
  );

  const activeGoals = useMemo(
    () =>
      filteredGoals
        .filter((goal) => !isGoalReached(goal))
        .sort((left, right) => {
          const leftDays = getDaysUntilTarget(left);
          const rightDays = getDaysUntilTarget(right);
          if (leftDays == null && rightDays == null) return 0;
          if (leftDays == null) return 1;
          if (rightDays == null) return -1;
          return leftDays - rightDays;
        }),
    [filteredGoals],
  );

  const approachingDeadlineGoals = useMemo(
    () =>
      activeGoals.filter((goal) => {
        const days = getDaysUntilTarget(goal);
        return days != null && days <= 30;
      }),
    [activeGoals],
  );

  const otherActiveGoals = useMemo(
    () =>
      activeGoals.filter((goal) => {
        const days = getDaysUntilTarget(goal);
        return days == null || days > 30;
      }),
    [activeGoals],
  );

  const handleOpenGoal = useCallback(
    (goal: GoalRow) => {
      const initialData = encodeURIComponent(JSON.stringify(goal));
      router.push({
        pathname: "/goal/[id]",
        params: { id: String(goal.id), initialData },
      });
    },
    [router],
  );

  return (
    <View style={styles.container}>
      <GoalSegmentedControl activeTab={activeTab} onChange={setActiveTab} ui={ui} />

      {activeTab === "activity" ? (
        activityItems.length === 0 ? (
          <EmptyState
            message={isLoading ? "Loading activity..." : "No Activity Found"}
          />
        ) : (
          <View style={styles.stack}>
            {activityItems.map((item, index) => {
              const previous = activityItems[index - 1];
              const showLabel =
                !previous || previous.date !== item.date;

              return (
                <View key={item.id} style={styles.stack}>
                  {showLabel ? (
                    <ThemedText style={[styles.sectionLabel, { color: ui.mutedText }]}>
                      {formatActivityDateLabel(item.date)}
                    </ThemedText>
                  ) : null}

                  <Pressable
                    onPress={() => {
                      const match = goals.find((goal) => goal.id === item.goalId);
                      if (match) handleOpenGoal(match);
                    }}
                    style={({ pressed }) => [
                      styles.activityRow,
                      {
                        backgroundColor: ui.surface,
                        borderColor: ui.border,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.rowTitle, { color: ui.text }]}>
                        {item.name}
                      </ThemedText>
                    </View>

                    <View style={styles.amountRow}>
                      <IconSymbol
                        name={item.direction === "in" ? "arrow.up" : "arrow.down"}
                        size={12}
                        color={item.direction === "in" ? ui.positive : ui.negative}
                      />
                      <ThemedText
                        style={[
                          styles.amountText,
                          {
                            color:
                              item.direction === "in" ? ui.positive : ui.negative,
                          },
                        ]}
                      >
                        {formatMoney(item.amount)}
                      </ThemedText>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )
      ) : activeTab === "active" ? (
        <View style={styles.stack}>
          {approachingDeadlineGoals.length > 0 ? (
            <GoalsSection
              label="Approaching Deadline..."
              labelColor="#B63A34"
              goals={approachingDeadlineGoals}
              selectableAccounts={selectableAccounts}
              ui={ui}
              onOpenGoal={handleOpenGoal}
            />
          ) : null}

          {otherActiveGoals.length > 0 ? (
            <GoalsSection
              label={approachingDeadlineGoals.length > 0 ? "Active Goals..." : "Goals"}
              labelColor={ui.text}
              goals={otherActiveGoals}
              selectableAccounts={selectableAccounts}
              ui={ui}
              onOpenGoal={handleOpenGoal}
            />
          ) : null}

          {activeGoals.length === 0 ? (
            <EmptyState
              message={isLoading ? "Loading goals..." : "No Goals Found"}
              buttonLabel={!isLoading ? "Add a Goal" : undefined}
              onPress={
                !isLoading
                  ? () => {
                      router.push("/goal-add");
                    }
                  : undefined
              }
            />
          ) : null}
        </View>
      ) : reachedGoals.length === 0 ? (
        <EmptyState
          message={
            isLoading
              ? "Loading reached goals..."
              : "There are no recent goals that has been reached"
          }
        />
      ) : (
        <View style={styles.stack}>
          {reachedGoals.map((goal) => (
            <Pressable
              key={goal.id}
              onPress={() => handleOpenGoal(goal)}
              style={({ pressed }) => [
                styles.reachedRow,
                { opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <View style={styles.reachedCopy}>
                <ThemedText style={[styles.reachedTitle, { color: ui.text }]}>
                  {goal.name}
                </ThemedText>
                <ThemedText style={[styles.reachedSubtitle, { color: ui.text }]}>
                  Goal Reached: {formatMoney(goal.target_amount)}
                </ThemedText>
              </View>

              {goal.target_date ? (
                <ThemedText style={[styles.reachedDate, { color: ui.mutedText }]}>
                  Due date: {formatShortDate(goal.target_date)}
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function GoalsSection({
  label,
  labelColor,
  goals,
  selectableAccounts,
  ui,
  onOpenGoal,
}: {
  label: string;
  labelColor: string;
  goals: GoalRow[];
  selectableAccounts: GoalSelectableAccount[];
  ui: typeof tabsTheme.ui;
  onOpenGoal: (goal: GoalRow) => void;
}) {
  return (
    <View style={styles.stack}>
      <ThemedText style={[styles.sectionLabel, { color: labelColor }]}>
        {label}
      </ThemedText>

      {goals.map((goal) => {
        const progress = getGoalProgress(goal);
        return (
          <Pressable
            key={goal.id}
            onPress={() => onOpenGoal(goal)}
            style={({ pressed }) => [
              styles.goalCard,
              {
                backgroundColor: ui.surface,
                borderColor: ui.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <View style={styles.goalCardTop}>
              <View style={styles.goalCopy}>
                <ThemedText style={[styles.goalCardTitle, { color: ui.text }]}>
                  {goal.name}
                </ThemedText>
                <ThemedText style={[styles.goalCardAmount, { color: ui.text }]}>
                  {formatMoney(goal.current_amount ?? 0)}
                </ThemedText>
              </View>

              <View style={styles.goalMeta}>
                <IconSymbol name="plus" size={14} color={ui.mutedText} />
                <ThemedText style={[styles.goalTarget, { color: ui.mutedText }]}>
                  Goal: {formatMoney(goal.target_amount)}
                </ThemedText>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(progress, 10)}%`,
                    backgroundColor: ui.accent,
                  },
                ]}
              />
            </View>

            <View style={styles.goalFooter}>
              <ThemedText style={[styles.goalFootnote, { color: ui.mutedText }]}>
                {getGoalDeadlineCopy(goal)}
              </ThemedText>
              <ThemedText
                numberOfLines={1}
                style={[styles.goalFootnote, { color: ui.mutedText, flex: 1, textAlign: "right" }]}
              >
                {getGoalLinkedAccountName(goal, selectableAccounts)}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function EmptyState({
  message,
  buttonLabel,
  onPress,
}: {
  message: string;
  buttonLabel?: string;
  onPress?: () => void;
}) {
  const ui = tabsTheme.ui;

  return (
    <View style={styles.emptyWrap}>
      <ThemedText style={[styles.emptyText, { color: ui.text }]}>{message}</ThemedText>
      {buttonLabel && onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.emptyButton,
            {
              borderColor: ui.border,
              backgroundColor: ui.surface,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <ThemedText style={[styles.emptyButtonText, { color: ui.text }]}>
            {buttonLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  stack: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    letterSpacing: 0.2,
  },
  emptyWrap: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 26,
    lineHeight: 30,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    maxWidth: 260,
  },
  emptyButton: {
    minWidth: 150,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    textTransform: "uppercase",
  },
  activityRow: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  amountText: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    fontVariant: ["tabular-nums"],
  },
  goalCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  goalCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  goalCopy: {
    flex: 1,
    gap: 3,
  },
  goalCardTitle: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  goalCardAmount: {
    fontSize: 16,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    fontVariant: ["tabular-nums"],
  },
  goalMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  goalTarget: {
    fontSize: 11,
    fontFamily: Tokens.font.family,
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#D8D8DE",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  goalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  goalFootnote: {
    fontSize: 11,
    fontFamily: Tokens.font.family,
  },
  reachedRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  reachedCopy: {
    flex: 1,
    gap: 2,
  },
  reachedTitle: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  reachedSubtitle: {
    fontSize: 13,
    fontFamily: Tokens.font.family,
  },
  reachedDate: {
    fontSize: 11,
    fontFamily: Tokens.font.family,
    marginTop: Platform.OS === "android" ? 2 : 3,
  },
});
