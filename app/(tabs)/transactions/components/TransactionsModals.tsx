import React from "react";

import { AddTransactionModal } from "@/components/AddTransactionModal";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import type { PlaidTransaction } from "@/utils/plaid";

import type {
  AccountRow,
  CategoryRow,
  ExpenseRow,
  RecurringRule,
  TransactionsUi,
} from "../types";

type TransactionsModalsProps = {
  formMode: "add" | "view" | "edit" | null;
  formTransaction: ExpenseRow | null;
  onCloseForm: () => void;
  onRequestEdit: () => void;
  onRequestDelete: () => void;
  accounts: AccountRow[];
  categories: CategoryRow[];
  recurringRules: RecurringRule[];
  plaidDetailTransaction: PlaidTransaction | null;
  isPlaidDetailVisible: boolean;
  onClosePlaidDetail: () => void;
  onRefresh: () => Promise<void>;
  ui: TransactionsUi;
  isDark: boolean;
  userId?: string;
};

// Groups the add/view/edit form and Plaid-only detail modal.
export function TransactionsModals({
  formMode,
  formTransaction,
  onCloseForm,
  onRequestEdit,
  onRequestDelete,
  accounts,
  categories,
  recurringRules,
  plaidDetailTransaction,
  isPlaidDetailVisible,
  onClosePlaidDetail,
  onRefresh,
  ui,
  isDark,
  userId,
}: TransactionsModalsProps) {
  const isFormVisible = formMode !== null;
  const resolvedMode = formMode ?? "add";

  return (
    <>
      <AddTransactionModal
        visible={isFormVisible}
        onClose={onCloseForm}
        accounts={accounts}
        categories={categories}
        onRefresh={onRefresh}
        ui={ui}
        isDark={isDark}
        userId={userId}
        mode={resolvedMode}
        initialTransaction={formTransaction}
        recurringRules={recurringRules}
        onEditRequest={resolvedMode === "view" ? onRequestEdit : undefined}
        onDeleteRequest={resolvedMode === "view" ? onRequestDelete : undefined}
      />

      <TransactionDetailModal
        visible={isPlaidDetailVisible}
        onClose={onClosePlaidDetail}
        transaction={plaidDetailTransaction}
        accounts={accounts}
        recurringRules={recurringRules}
      />
    </>
  );
}
