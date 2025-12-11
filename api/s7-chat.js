import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {

  // --- CORS ALLOW STORE7994.COM ---
  res.setHeader("Access-Control-Allow-Origin", "https://store7994.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // ---------------------------------

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required." });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 🟢 FIX: Vercel already parses JSON body
    const { message, threadId } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Missing message." });
    }

    // 1. Create thread if missing
    let finalThreadId = threadId;
    if (!finalThreadId) {
      const thread = await client.beta.threads.create();
      finalThreadId = thread.id;
    }

    // 2. Add user message
    await client.beta.threads.messages.create(finalThreadId, {
      role: "user",
      content: message
    });

    // 3. Run assistant
    const run = await client.beta.threads.runs.create(finalThreadId, {
      assistant_id: "asst_NmKYDW1h87isRpw1NlO7eJuF"
    });

    // 4. Poll for completion
    // Poll until run is completed AND an assistant message exists
let completed = false;
let lastMessageId = null;

while (!completed) {
  await new Promise(r => setTimeout(r, 900));

  const curRun = await client.beta.threads.runs.retrieve(finalThreadId, run.id);

  if (curRun.status === "failed") {
    return res.status(500).json({ error: "Assistant run failed." });
  }

  if (curRun.status === "completed") {
    const list = await client.beta.threads.messages.list(finalThreadId);

    const assistantMsg = list.data.find(m => m.role === "assistant");

    if (assistantMsg) {
      lastMessageId = assistantMsg.id;
      completed = true;
      break;
    }
  }
}


    // 5. Fetch assistant reply
    const messages = await client.beta.threads.messages.list(finalThreadId);
    // Get newest assistant message only
const latestAssistantMessage = messages.data.find(
  m => m.role === "assistant"
);

const reply =
  latestAssistantMessage?.content?.[0]?.text?.value ||
  "I'm here to assist you!";


    return res.status(200).json({
      threadId: finalThreadId,
      reply
    });

  } catch (err) {
    console.error("S7-CHAT ERROR:", err);
    return res.status(500).json({ error: "Chat endpoint failure." });
  }

}



