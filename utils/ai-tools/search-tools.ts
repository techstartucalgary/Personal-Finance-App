import { SupabaseClient } from "@supabase/supabase-js";
import { createGateway, embed, tool } from "ai";
import { z } from "zod";

type Gateway = ReturnType<typeof createGateway>;

export const searchTools = (
  profile_id: string,
  supabase: SupabaseClient,
  gateway: Gateway,
) => {
  const embeddingModel =
    process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small";

  const embedQuery = async (text: string): Promise<number[]> => {
    const { embedding } = await embed({
      model: gateway.textEmbeddingModel(embeddingModel),
      value: text,
    });
    return embedding;
  };

  return {
    searchExpensesSemantic: tool({
      description:
        "Semantically search expense transactions by description. Use ONLY for fuzzy / content-based queries (e.g. 'coffee shops', 'that subscription I cancelled', 'streaming services'). Do NOT use for date-range or numeric questions — use queryExpensesByDateRange instead.",
      inputSchema: z.object({
        query: z.string().min(1, "Query is required"),
        limit: z.number().int().positive().max(25).default(10),
        threshold: z.number().min(0).max(1).default(0.3),
      }),
      execute: async ({ query, limit, threshold }) => {
        console.log("[tool:searchExpensesSemantic]", {
          query,
          limit,
          threshold,
        });
        try {
          const queryEmbedding = await embedQuery(query);

          const { data, error } = await supabase.rpc("match_expenses", {
            query_embedding: queryEmbedding,
            p_profile_id: profile_id,
            match_threshold: threshold,
            match_count: limit,
          });

          if (error) {
            console.error("match_expenses error:", error);
            return `Search failed: ${error.message}`;
          }

          if (!data || data.length === 0) {
            return { matches: [], message: "No matching expenses found." };
          }

          return {
            matches: data.map((row: any) => ({
              description: row.description,
              amount: row.amount,
              transaction_date: row.transaction_date,
              similarity: Number(
                row.similarity?.toFixed?.(3) ?? row.similarity,
              ),
            })),
            count: data.length,
          };
        } catch (err) {
          console.error("Error in searchExpensesSemantic:", err);
          return "An error occurred while searching expenses.";
        }
      },
    }),

    searchIncomesSemantic: tool({
      description:
        "Semantically search income transactions by source description. Use ONLY for fuzzy / content-based queries (e.g. 'side gig income', 'that one-time bonus'). Do NOT use for date-range or numeric questions — use queryIncomesByDateRange instead.",
      inputSchema: z.object({
        query: z.string().min(1, "Query is required"),
        limit: z.number().int().positive().max(25).default(10),
        threshold: z.number().min(0).max(1).default(0.3),
      }),
      execute: async ({ query, limit, threshold }) => {
        console.log("[tool:searchIncomesSemantic]", {
          query,
          limit,
          threshold,
        });
        try {
          const queryEmbedding = await embedQuery(query);

          const { data, error } = await supabase.rpc("match_incomes", {
            query_embedding: queryEmbedding,
            p_profile_id: profile_id,
            match_threshold: threshold,
            match_count: limit,
          });

          if (error) {
            console.error("match_incomes error:", error);
            return `Search failed: ${error.message}`;
          }

          if (!data || data.length === 0) {
            return { matches: [], message: "No matching income found." };
          }

          return {
            matches: data.map((row: any) => ({
              source_description: row.source_description,
              amount: row.amount,
              created_at: row.created_at,
              similarity: Number(
                row.similarity?.toFixed?.(3) ?? row.similarity,
              ),
            })),
            count: data.length,
          };
        } catch (err) {
          console.error("Error in searchIncomesSemantic:", err);
          return "An error occurred while searching income.";
        }
      },
    }),
  };
};
