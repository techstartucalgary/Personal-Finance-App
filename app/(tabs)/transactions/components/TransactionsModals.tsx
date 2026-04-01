import React from "react";

import { AddTransactionModal } from "@/components/AddTransactionModal";
import { EditTransactionModal } from "@/components/EditTransactionModal";
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
  addModalOpen: boolean;
  onCloseAddModal: () => void;
  accounts: AccountRow[];
  categories: CategoryRow[];
  recurringRules: RecurringRule[];
  selectedDetailTransaction: ExpenseRow | PlaidTransaction | null;
  isDetailModalVisible: boolean;
  onCloseDetailModal: () => void;
  onEditExpense: (expense: ExpenseRow) => void;
  editingExpense: ExpenseRow | null;
  onCloseEditExpense: () => void;
  onRefresh: () => Promise<void>;
  ui: TransactionsUi;
  isDark: boolean;
  userId?: string;
};

// Groups the add/edit/detail modals so the screen stays uncluttered.
export function TransactionsModals({
  addModalOpen,
  onCloseAddModal,
  accounts,
  categories,
  recurringRules,
  selectedDetailTransaction,
  isDetailModalVisible,
  onCloseDetailModal,
  onEditExpense,
  editingExpense,
  onCloseEditExpense,
  onRefresh,
  ui,
  isDark,
  userId,
}: TransactionsModalsProps) {
  return (
    <>
      <AddTransactionModal
        visible={addModalOpen}
        onClose={onCloseAddModal}
        accounts={accounts}
        categories={categories}
        onRefresh={onRefresh}
        ui={ui}
        isDark={isDark}
        userId={userId}
      />

      <TransactionDetailModal
        visible={isDetailModalVisible}
        onClose={onCloseDetailModal}
        transaction={selectedDetailTransaction}
        accounts={accounts}
        onEdit={(expense) => {
          onEditExpense(expense);
        }}
        recurringRules={recurringRules}
      >
        <EditTransactionModal
          visible={!!editingExpense}
          onClose={onCloseEditExpense}
          expense={editingExpense}
          accounts={accounts}
          categories={categories}
          recurringRules={recurringRules}
          onRefresh={onRefresh}
          ui={ui}
          isDark={isDark}
          userId={userId}
        />
      </TransactionDetailModal>
    </>
  );
}
