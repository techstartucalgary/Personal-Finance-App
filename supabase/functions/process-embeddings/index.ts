// =============================================================================
// process-embeddings — Supabase Edge Function (Deno)
// =============================================================================
// Triggered by pg_net.http_post from the embedding triggers in
// db/embeddings-setup.sql. For each queue row:
//   1. Look up the row, mark `processing`, increment attempts
//   2. Whitelist-validate source_table (prevents SQL injection — adding a new
//      embeddable table requires editing TABLE_WHITELIST below)
//   3. Call the Vercel AI Gateway embeddings endpoint (OpenAI-compatible)
//   4. Write embedding + embedding_updated_at back to the source row
//   5. Mark queue row done. On failure: retry via `pending` if attempts < 3,
//      else mark `failed` with last_error.
//
// Required env vars (auto-injected by Supabase except the ones marked manual):
//   SUPABASE_URL                — auto
//   SUPABASE_SERVICE_ROLE_KEY   — auto (used to create the Supabase client)
//   WORKER_SHARED_SECRET        — manual; must match the vault `service_role_key` value
//                                 (separate from the auto-injected key to avoid the new
//                                  key-system rollout mismatching the auto-injected one)
//   AI_GATEWAY_API_KEY          — manual
//   EMBEDDING_MODEL             — e.g. "openai/text-embedding-3-small" (1536 dims)
//
// Deploy:  supabase functions deploy process-embeddings
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@^2.78.0";

// -----------------------------------------------------------------------------
// >>> ADD NEW TABLE HERE <<<
// Whitelist of source_table → row config. Adding a new embeddable table
// (e.g. Goals, Plaid transactions) means adding one entry here PLUS the SQL
// pieces in db/embeddings-setup.sql. Nothing else.
// -----------------------------------------------------------------------------
const TABLE_WHITELIST: Record<
  string,
  {
    tableName: string;
    idCol: string;
    embeddingCol: string;
    updatedCol: string;
  }
> = {
  Expense: {
    tableName: "Expense",
    idCol: "id",
    embeddingCol: "embedding",
    updatedCol: "embedding_updated_at",
  },
  Income: {
    tableName: "Income",
    idCol: "id",
    embeddingCol: "embedding",
    updatedCol: "embedding_updated_at",
  },
};

const MAX_ATTEMPTS = 3;
const AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/embeddings";

// -----------------------------------------------------------------------------
// HTTP handler
// -----------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const WORKER_SHARED_SECRET = Deno.env.get("WORKER_SHARED_SECRET");
  const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");
  const EMBEDDING_MODEL = Deno.env.get("EMBEDDING_MODEL");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !WORKER_SHARED_SECRET || !AI_GATEWAY_API_KEY || !EMBEDDING_MODEL) {
    console.error("[process-embeddings] missing required env vars");
    return json({ error: "Server misconfigured" }, 500);
  }

  // Auth: caller must present the worker shared secret
  // (decoupled from Supabase's auto-injected service role key, which can mismatch
  // vault under the new key system)
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${WORKER_SHARED_SECRET}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  let queue_id: number | undefined;
  try {
    const body = await req.json();
    queue_id = body?.queue_id;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (typeof queue_id !== "number") {
    return json({ error: "queue_id (number) required" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ---- 1. Read queue row, mark processing, bump attempts ---------------------
  const { data: queueRow, error: readErr } = await supabase
    .from("embedding_queue")
    .select("id, source_table, source_id, source_text, status, attempts")
    .eq("id", queue_id)
    .single();

  if (readErr || !queueRow) {
    console.error("[process-embeddings] queue row not found", queue_id, readErr);
    return json({ error: "Queue row not found" }, 404);
  }

  if (queueRow.status === "done") {
    return json({ ok: true, skipped: "already done" });
  }

  const attempts = (queueRow.attempts ?? 0) + 1;

  const { error: markErr } = await supabase
    .from("embedding_queue")
    .update({ status: "processing", attempts })
    .eq("id", queue_id);
  if (markErr) {
    console.error("[process-embeddings] failed to mark processing", markErr);
    return json({ error: "Failed to mark processing" }, 500);
  }

  // ---- 2. Whitelist check ----------------------------------------------------
  const tableConfig = TABLE_WHITELIST[queueRow.source_table];
  if (!tableConfig) {
    await markFailed(
      supabase,
      queue_id,
      attempts,
      `source_table "${queueRow.source_table}" not in whitelist`,
    );
    return json({ error: "source_table not whitelisted" }, 400);
  }

  // ---- 3. Embed --------------------------------------------------------------
  let embedding: number[];
  try {
    embedding = await embedText({
      text: queueRow.source_text,
      apiKey: AI_GATEWAY_API_KEY,
      model: EMBEDDING_MODEL,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[process-embeddings] embed failed", msg);
    await retryOrFail(supabase, queue_id, attempts, `embed: ${msg}`);
    return json({ error: "Embedding failed", message: msg }, 502);
  }

  // ---- 4. Write embedding back to source row ---------------------------------
  const { error: updateErr } = await supabase
    .from(tableConfig.tableName)
    .update({
      [tableConfig.embeddingCol]: embedding,
      [tableConfig.updatedCol]: new Date().toISOString(),
    })
    .eq(tableConfig.idCol, queueRow.source_id);

  if (updateErr) {
    console.error("[process-embeddings] update target failed", updateErr);
    await retryOrFail(supabase, queue_id, attempts, `update: ${updateErr.message}`);
    return json({ error: "Failed to write embedding" }, 500);
  }

  // ---- 5. Mark queue row done ------------------------------------------------
  await supabase
    .from("embedding_queue")
    .update({
      status: "done",
      processed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", queue_id);

  return json({ ok: true, queue_id, source: queueRow.source_table, source_id: queueRow.source_id });
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
async function embedText(params: {
  text: string;
  apiKey: string;
  model: string;
}): Promise<number[]> {
  const res = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({ model: params.model, input: params.text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gateway ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const vec = data?.data?.[0]?.embedding;
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error("Gateway returned no embedding");
  }
  return vec;
}

async function retryOrFail(
  supabase: ReturnType<typeof createClient>,
  queueId: number,
  attempts: number,
  errorMsg: string,
) {
  if (attempts >= MAX_ATTEMPTS) {
    await markFailed(supabase, queueId, attempts, errorMsg);
  } else {
    // Leave as pending so a future notify can retry
    await supabase
      .from("embedding_queue")
      .update({ status: "pending", last_error: errorMsg })
      .eq("id", queueId);
  }
}

async function markFailed(
  supabase: ReturnType<typeof createClient>,
  queueId: number,
  _attempts: number,
  errorMsg: string,
) {
  await supabase
    .from("embedding_queue")
    .update({
      status: "failed",
      last_error: errorMsg,
      processed_at: new Date().toISOString(),
    })
    .eq("id", queueId);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
