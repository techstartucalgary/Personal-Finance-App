import { allAccounts } from "@/utils/ai-tools";
import { gateway } from "@ai-sdk/gateway";
import { convertToModelMessages, streamText } from "ai";
export async function POST(req: Request) {
  
  
  const requestData = await req.json();
  console.log('Full request data:', requestData);
  
  const messages = requestData.messages;
  const profile_id = requestData.profile_id;

  const result = streamText({
    model: gateway("google/gemini-2.0-flash"),
    messages: await convertToModelMessages(messages),
    system: `You are the Sterling Financial Engine, a high-precision financial analyzer and advisor. 
    Your goal is to help users manage their wealth through accurate data entry, insightful analysis, and proactive coaching.`,
    tools: {listAccounts: allAccounts(profile_id)} ,
    
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
}
