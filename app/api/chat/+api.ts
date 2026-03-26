import { allAccounts } from "@/utils/ai-tools";
// import { gateway } from "@ai-sdk/gateway";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, createGateway, stepCountIs, streamText } from "ai";
import { Agent } from 'undici';
export async function POST(req: Request) {
  
  
  const requestData = await req.json();
  console.log('Full request data:', requestData);
  
  const messages = requestData.messages;
  const profile_id = requestData.profile_id; 
  const token = requestData.token;

  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, // latest supabase document recommends using a supabase secret key instead of service role key
  );

  // validate token
  let userId: string | null = null;
  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error('Token validation failed:', error);
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
      }
      userId = data.user?.id || null;
      console.log('✅ Token validated. User ID:', userId);
    } catch (err) {
      console.error('Auth error:', err);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Auth failed' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Profile ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }


  const gateway = createGateway({
    fetch: (url, init) =>
      fetch(url, {
        ...init,
        dispatcher: new Agent({
          headersTimeout: 15 * 60 * 1000, // 15 minutes
          bodyTimeout: 15 * 60 * 1000,
        }),
      } as RequestInit),
  });
  const result = streamText({
    model: gateway("openai/gpt-5-nano"),
    messages: await convertToModelMessages(messages),
    system: `You are the Sterling Financial Engine, a high-precision financial analyzer and advisor. 
    Your goal is to help users manage their wealth through accurate data entry, insightful analysis, and proactive coaching.`,
    tools: {listAccounts: allAccounts(userId, supabase)} ,
    stopWhen: stepCountIs(5)
    
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
}
