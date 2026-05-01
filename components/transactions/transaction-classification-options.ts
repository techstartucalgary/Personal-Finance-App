import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps } from "react";

export type TransactionType = "expense" | "income" | "transfer";

export type CategorySuggestion = {
  label: string;
  icon: ComponentProps<typeof Feather>["name"];
  color: string;
};

export type SubcategoryMap = Record<string, string[]>;

export const EXPENSE_CATEGORY_SUGGESTIONS: CategorySuggestion[] = [
  { label: "Auto & Transport", icon: "truck", color: "#4C6EF5" },
  { label: "Housing", icon: "home", color: "#1971C2" },
  { label: "Bills & Utilities", icon: "zap", color: "#15AABF" },
  { label: "Food & Dining", icon: "coffee", color: "#F08C00" },
  { label: "Groceries", icon: "shopping-cart", color: "#2F9E44" },
  { label: "Shopping", icon: "shopping-bag", color: "#E8590C" },
  { label: "Health & Fitness", icon: "activity", color: "#E03131" },
  { label: "Entertainment", icon: "film", color: "#845EF7" },
  { label: "Travel", icon: "map-pin", color: "#F06595" },
  { label: "Gifts & Donations", icon: "gift", color: "#BE4BDB" },
];

export const INCOME_CATEGORY_SUGGESTIONS: CategorySuggestion[] = [
  { label: "Salary", icon: "briefcase", color: "#2F9E44" },
  { label: "Business Income", icon: "dollar-sign", color: "#12B886" },
  { label: "Freelance", icon: "pen-tool", color: "#15AABF" },
  { label: "Investments", icon: "trending-up", color: "#1C7ED6" },
  { label: "Interest", icon: "percent", color: "#5C7CFA" },
  { label: "Gifts", icon: "gift", color: "#F06595" },
  { label: "Rental Income", icon: "home", color: "#1971C2" },
  { label: "Refunds", icon: "refresh-cw", color: "#ADB5BD" },
  { label: "Bonuses", icon: "award", color: "#F59F00" },
  { label: "Other Income", icon: "layers", color: "#845EF7" },
];

export const ALL_CATEGORY_SUGGESTIONS = [
  ...EXPENSE_CATEGORY_SUGGESTIONS,
  ...INCOME_CATEGORY_SUGGESTIONS,
].filter(
  (item, index, arr) =>
    arr.findIndex(
      (entry) => entry.label.toLowerCase() === item.label.toLowerCase(),
    ) === index,
);

export const EXPENSE_SUBCATEGORIES: SubcategoryMap = {
  "Auto & Transport": [
    "Auto Payment",
    "Public Transit",
    "Gas",
    "Auto Maintenance",
    "Parking & Tolls",
    "Taxi & Ride Shares",
  ],
  Housing: ["Mortgage", "Rent", "Home Improvement", "HOA Fees", "Property Tax"],
  "Bills & Utilities": [
    "Electricity",
    "Water",
    "Internet",
    "Phone",
    "Gas",
    "Garbage",
  ],
  "Food & Dining": ["Restaurants", "Cafe", "Takeout", "Delivery"],
  Groceries: ["Supermarket", "Farmers Market", "Snacks", "Household"],
  Shopping: ["Clothing", "Electronics", "Home Goods", "Personal Care"],
  "Health & Fitness": ["Pharmacy", "Doctor", "Dental", "Gym"],
  Entertainment: ["Movies", "Games", "Streaming", "Events"],
  Travel: ["Flights", "Hotels", "Transit", "Car Rental"],
  "Gifts & Donations": ["Charity", "Gifts"],
  Other: ["Misc", "One-time", "Recurring"],
};

export const INCOME_SUBCATEGORIES: SubcategoryMap = {
  Salary: ["Paychecks", "Bonuses", "Commission"],
  "Business Income": ["Sales", "Services", "Other"],
  Freelance: ["Projects", "Consulting", "Contract"],
  Investments: ["Dividends", "Capital Gains", "Interest"],
  Interest: ["Bank Interest", "Cashback", "Savings Interest"],
  Gifts: ["Gifts", "Donations", "Support"],
  "Rental Income": ["Rent", "Lease", "Airbnb"],
  Refunds: ["Returns", "Reimbursements", "Tax Refund"],
  Bonuses: ["Annual Bonus", "Performance Bonus", "Referral Bonus"],
  "Other Income": ["Other", "Misc", "One-time"],
  Other: ["Other", "Misc", "One-time"],
};

export function getCategorySuggestions(transactionType: TransactionType) {
  return transactionType === "income"
    ? INCOME_CATEGORY_SUGGESTIONS
    : EXPENSE_CATEGORY_SUGGESTIONS;
}

export function resolveCategorySuggestion(categoryName?: string | null) {
  const normalized = (categoryName ?? "").trim().toLowerCase();
  return (
    ALL_CATEGORY_SUGGESTIONS.find(
      (item) => item.label.toLowerCase() === normalized,
    ) ?? null
  );
}

export function getSuggestedSubcategories(
  categoryName: string | null | undefined,
  transactionType: TransactionType,
) {
  const name = (categoryName ?? "").trim();
  if (!name) return [];
  const source =
    transactionType === "income" ? INCOME_SUBCATEGORIES : EXPENSE_SUBCATEGORIES;
  const exact = Object.keys(source).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );
  if (exact) return source[exact];
  const partial = Object.keys(source).find((key) =>
    name.toLowerCase().includes(key.toLowerCase()),
  );
  if (partial) return source[partial];
  return source.Other ?? [];
}
