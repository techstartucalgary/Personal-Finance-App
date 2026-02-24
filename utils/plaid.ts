import { supabase } from "./supabase";

// ── Types ──────────────────────────────────────────

export type PlaidItem = {
    id: string;
    profile_id: string;
    item_id: string;
    institution_name: string | null;
    created_at: string;
};

// ── Helpers ────────────────────────────────────────

/**
 * Request a Plaid Link token from the server.
 * The Edge Function authenticates via the user's JWT session.
 */
export async function getLinkToken(): Promise<string> {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
        throw new Error("Not authenticated");
    }

    const { data, error } = await supabase.functions.invoke("create-link-token", {
        method: "POST",
    });

    if (error) throw error;
    if (!data?.link_token) throw new Error("No link_token returned");

    return data.link_token;
}

/**
 * Exchange a public_token (from Plaid Link) for an access_token.
 * The access_token is stored server-side — it never reaches the client.
 */
export async function exchangePublicToken(
    publicToken: string,
    institutionName?: string,
): Promise<{ success: boolean; item_id: string }> {
    const { data, error } = await supabase.functions.invoke(
        "exchange-public-token",
        {
            method: "POST",
            body: {
                public_token: publicToken,
                institution_name: institutionName,
            },
        },
    );

    if (error) throw error;
    if (!data?.success) throw new Error("Token exchange failed");

    return data;
}

/**
 * List all Plaid-connected institutions for the current user.
 */
export async function listPlaidItems(profileId: string): Promise<PlaidItem[]> {
    const { data, error } = await supabase
        .from("plaid_items")
        .select("id, profile_id, item_id, institution_name, created_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as PlaidItem[]) ?? [];
}

// ── Plaid Account Types ────────────────────────────

export type PlaidAccountBalances = {
    available: number | null;
    current: number | null;
    limit: number | null;
    iso_currency_code: string | null;
};

export type PlaidAccount = {
    plaid_item_id: string;
    institution_name: string | null;
    account_id: string;
    name: string;
    official_name: string | null;
    type: string; // "depository", "credit", "loan", "investment"
    subtype: string | null; // "checking", "savings", "credit card", etc.
    mask: string | null; // last 4 digits
    balances: PlaidAccountBalances;
};

/**
 * Fetch all bank accounts from Plaid for the current user.
 * The Edge Function reads the stored access tokens and calls Plaid's /accounts/get.
 */
export async function getPlaidAccounts(): Promise<PlaidAccount[]> {
    const { data, error } = await supabase.functions.invoke("get-plaid-accounts", {
        method: "POST",
    });

    if (error) throw error;
    return (data?.accounts as PlaidAccount[]) ?? [];
}

// ── Plaid Transaction Types ────────────────────────

export type PlaidTransaction = {
    plaid_item_id: string;
    institution_name: string | null;
    transaction_id: string;
    account_id: string;
    account_name: string | null;
    account_mask: string | null;
    account_subtype: string | null;
    name: string;
    merchant_name: string | null;
    amount: number; // positive = money out, negative = money in (Plaid convention)
    date: string; // YYYY-MM-DD
    category: string[] | null;
    pending: boolean;
    iso_currency_code: string | null;
    payment_channel: string | null;
};

/**
 * Fetch Plaid transactions for the current user.
 * Default range: last 30 days (server-side default).
 */
export async function getPlaidTransactions(opts?: {
    startDate?: string;
    endDate?: string;
}): Promise<PlaidTransaction[]> {
    const { data, error } = await supabase.functions.invoke("get-plaid-transactions", {
        method: "POST",
        body: {
            start_date: opts?.startDate,
            end_date: opts?.endDate,
        },
    });

    if (error) throw error;
    return (data?.transactions as PlaidTransaction[]) ?? [];
}

/**
 * Remove a Plaid connection. Revokes the access token with Plaid
 * and deletes the record from plaid_items.
 */
export async function removePlaidItem(plaidItemId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke("remove-plaid-item", {
        method: "POST",
        body: { plaid_item_id: plaidItemId },
    });

    if (error) throw error;
    if (!data?.success) throw new Error("Failed to remove connection");
}
