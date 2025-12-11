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
    let status = run.status;
    while (status !== "completed") {
      await new Promise(r => setTimeout(r, 1000));
      const check = await client.beta.threads.runs.retrieve(finalThreadId, run.id);
      status = check.status;
      if (status === "failed") {
        return res.status(500).json({ error: "Assistant run failed." });
      }
    }

    // 5. Fetch assistant reply
    const messages = await client.beta.threads.messages.list(finalThreadId);
    const reply =
      messages.data
        .filter(m => m.role === "assistant")
        .pop()?.content?.[0]?.text?.value || "I am here to assist you!";

    return res.status(200).json({
      threadId: finalThreadId,
      reply
    });

  } catch (err) {
    console.error("S7-CHAT ERROR:", err);
    return res.status(500).json({ error: "Chat endpoint failure." });
  }

}



