import { supabase } from "./supabase";

export type AccountRow = {
  id: number;
  profile_id: string;
  created_at?: string | null;
  account_name: string | null;
  account_type: string | null;
  currency: string | null;
};

export async function listAccounts(params: { profile_id: string }) {
  const { profile_id } = params;

  const { data, error } = await supabase
    .from("account")
    .select("id, profile_id, created_at, account_name, account_type, currency")
    .eq("profile_id", profile_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as AccountRow[];
}

export type AccountInsert = {
  profile_id: string;
  account_name: string;
  account_type: "credit" | "debit";
  balance: number;
  credit_limit: number;
  statement_duedate: string;
  payment_duedate: string;
  interest_rate: number;
  currency: string;
};

export async function createAccount(params: AccountInsert) {
  const { error } = await supabase.from("account").insert(params);

  if (error) throw error;
  return true;
}

export type AccountUpdate = Partial<
  Omit<AccountInsert, "profile_id" | "account_type">
> & {
  account_type?: "credit" | "debit";
};

export async function updateAccount(params: {
  id: string;
  profile_id: string;
  update: AccountUpdate;
}) {
  const { id, profile_id, update } = params;

  const { error } = await supabase
    .from("account")
    .update(update)
    .eq("id", id)
    .eq("profile_id", profile_id);

  if (error) throw error;
  return true;
}

export async function deleteAccount(params: {
  id: string;
  profile_id: string;
}) {
  const { id, profile_id } = params;
  const accountId = Number.isNaN(Number(id)) ? id : Number(id);

  const { error: expenseError } = await supabase
    .from("Expense")
    .delete()
    .eq("account_id", accountId)
    .eq("profile_id", profile_id);

  if (expenseError) throw expenseError;

  const { error } = await supabase
    .from("account")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile_id);

  if (error) throw error;
  return true;
}
