import type { AccountType } from "@/components/accounts/tab/types";

let pendingAddAccountType: AccountType | null = null;

export function setPendingAddAccountType(nextType: AccountType) {
  pendingAddAccountType = nextType;
}

export function consumePendingAddAccountType() {
  const nextType = pendingAddAccountType;
  pendingAddAccountType = null;
  return nextType;
}
