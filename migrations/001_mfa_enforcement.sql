-- MFA Enforcement: Restrictive RLS policies for opted-in users
-- 
-- Strategy: "Enforce only for users that have opted-in"
-- If a user has at least one verified MFA factor, they MUST have aal2.
-- Users without MFA continue to work normally with aal1.
-- 
-- These are RESTRICTIVE policies — they stack on top of existing
-- permissive policies to add an additional constraint.
--
-- The <@ operator is PostgreSQL's "contained in" operator.
-- When a user has verified factors, only aal2 JWTs are accepted.
-- When a user has no factors, both aal1 and aal2 are accepted.

-- profiles
CREATE POLICY "mfa_enforce_profiles"
  ON public.profiles
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- account
CREATE POLICY "mfa_enforce_account"
  ON public.account
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- Expense
CREATE POLICY "mfa_enforce_expense"
  ON public."Expense"
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- Expense_category
CREATE POLICY "mfa_enforce_expense_category"
  ON public."Expense_category"
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- SubExpense_category
CREATE POLICY "mfa_enforce_subexpense_category"
  ON public."SubExpense_category"
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- Income
CREATE POLICY "mfa_enforce_income"
  ON public."Income"
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- Income_category
CREATE POLICY "mfa_enforce_income_category"
  ON public."Income_category"
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- Budget
CREATE POLICY "mfa_enforce_budget"
  ON public."Budget"
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- Expense_category_budget
CREATE POLICY "mfa_enforce_expense_category_budget"
  ON public."Expense_category_budget"
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- SubExpense_category_budget
CREATE POLICY "mfa_enforce_subexpense_category_budget"
  ON public."SubExpense_category_budget"
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- Goal
CREATE POLICY "mfa_enforce_goal"
  ON public."Goal"
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- Reminder
CREATE POLICY "mfa_enforce_reminder"
  ON public."Reminder"
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- Summary
CREATE POLICY "mfa_enforce_summary"
  ON public."Summary"
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- recurring_expense_rules
CREATE POLICY "mfa_enforce_recurring_expense_rules"
  ON public.recurring_expense_rules
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- plaid_items
CREATE POLICY "mfa_enforce_plaid_items"
  ON public.plaid_items
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );

-- flinks_items
CREATE POLICY "mfa_enforce_flinks_items"
  ON public.flinks_items
  AS RESTRICTIVE
  TO authenticated
  USING (
    array[(select auth.jwt()->>'aal')] <@ (
      select
        case
          when count(id) > 0 then array['aal2']
          else array['aal1', 'aal2']
        end as aal
      from auth.mfa_factors
      where ((select auth.uid()) = user_id) and status = 'verified'
    )
  );
