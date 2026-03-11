import { convertToModelMessages, gateway, streamText, UIMessage } from 'ai';



export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  console.log('CHAT API called')

  const result = streamText({
    model: gateway("google/gemini-2.5-flash-lite-preview-09-2025"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}