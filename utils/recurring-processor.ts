import { addExpense, hasRecurringExpense } from "./expenses";
import { listDueRecurringRules, updateRecurringRule } from "./recurring-rules";


function toYMD(date: Date) {
    return date.toISOString().slice(0, 10);
  }
  
  function addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() + days);
    return x;
  }
  
  function addMonths(d: Date, months: number) {
    const x = new Date(d);
    x.setUTCMonth(x.getUTCMonth() + months);
    return x;
  }
  
  export function computeNextRunDate(next_run_date: string, frequency: string) {
    const base = new Date(`${next_run_date}T00:00:00Z`);
    const f = frequency.toLowerCase().trim();
  
    if (f === "daily") return toYMD(addDays(base, 1));
    if (f === "weekly") return toYMD(addDays(base, 7));
    if (f === "biweekly") return toYMD(addDays(base, 14));
    if (f === "monthly") return toYMD(addMonths(base, 1));
    if (f === "yearly" || f === "annually") return toYMD(addMonths(base, 12));
  
    
    return toYMD(addMonths(base, 1));
  }
  




export async function processDueRecurringRules(params: {
  profile_id: string;
  today: string; // "YYYY-MM-DD"
}) {
  const dueRules = await listDueRecurringRules(params);

  const createdTransactions = [];

  for (const rule of dueRules) {

    // check if transaction already exists in case recurring process runs more than once

    const exists = await hasRecurringExpense({
        profile_id: params.profile_id,
        recurring_rule_id: rule.id,
        transaction_date: rule.next_run_date
    })
    
    //  create the expense transaction
    const txn = await addExpense({
      profile_id: params.profile_id,
      recurring_rule_id: rule.id,
      account_id: rule.account_id,
      amount: rule.amount,
      transaction_date: rule.next_run_date,
      expense_categoryid: rule.expense_categoryid ?? null,
      subcategory_id: rule.subcategory_id ?? null,
    });

    createdTransactions.push(txn);

    // get the next date
    const next = computeNextRunDate(rule.next_run_date, rule.frequency);

    // stop the rule if next due date is past the end date for the rule
    if (rule.end_date && next > rule.end_date) {
      await updateRecurringRule({
        id: rule.id,
        profile_id: params.profile_id,
        updates: { is_active: false },
      });
      continue;
    }

    await updateRecurringRule({
      id: rule.id,
      profile_id: params.profile_id,
      updates: { next_run_date: next },
    });
  }

  return createdTransactions;
}
