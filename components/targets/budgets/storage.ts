import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BudgetPreferencesMap, BudgetUiPreference } from "./types";

const STORAGE_KEY = "@budget-ui-preferences";

const DEFAULT_PREFERENCE: BudgetUiPreference = {
  linkedAccountKey: null,
  rolloverEnabled: false,
};

async function readBudgetPreferences() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {} as BudgetPreferencesMap;

    const parsed = JSON.parse(raw) as BudgetPreferencesMap;
    return parsed ?? {};
  } catch (error) {
    console.error("Error reading budget UI preferences:", error);
    return {} as BudgetPreferencesMap;
  }
}

async function writeBudgetPreferences(nextValue: BudgetPreferencesMap) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
}

export function getDefaultBudgetUiPreference() {
  return { ...DEFAULT_PREFERENCE };
}

export async function getAllBudgetUiPreferences() {
  return readBudgetPreferences();
}

export async function getBudgetUiPreference(budgetId: string | number) {
  const preferences = await readBudgetPreferences();
  return preferences[String(budgetId)] ?? getDefaultBudgetUiPreference();
}

export async function saveBudgetUiPreference(
  budgetId: string | number,
  preference: BudgetUiPreference,
) {
  const preferences = await readBudgetPreferences();
  preferences[String(budgetId)] = preference;
  await writeBudgetPreferences(preferences);
}

export async function removeBudgetUiPreference(budgetId: string | number) {
  const preferences = await readBudgetPreferences();
  delete preferences[String(budgetId)];
  await writeBudgetPreferences(preferences);
}
