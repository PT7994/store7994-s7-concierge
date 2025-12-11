// ===============================
// S7 CHAT ENDPOINT — FINAL VERSION
// Supports JSON product responses + CORS
// ===============================

import OpenAI from "openai";

export default async function handler(req, res) {
  // ---------- CORS ----------
  res.setHeader("Access-Control-Allow-Origin", "https://store7994.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // ---------------------------

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required." });
  }

  try {
    const { message, threadId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    let finalThreadId = threadId;

    // 1. Create thread if missing
    if (!finalThreadId) {
      const newThread = await client.beta.threads.create();
      finalThreadId = newThread.id;
    }

    // 2. Add user message
    await client.beta.threads.messages.create(finalThreadId, {
      role: "user",
      content: message
    });

    // 3. Begin run
    const run = await client.beta.threads.runs.create(finalThreadId, {
      assistant_id: process.env.ASSISTANT_ID
    });

    // 4. Poll until complete
    let status = run.status;
    while (status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const check = await client.beta.threads.runs.retrieve(finalThreadId, run.id);

      if (check.status === "failed") {
        return res.status(500).json({ error: "The assistant run failed." });
      }
      status = check.status;
    }

    // 5. Get messages
    const messages = await client.beta.threads.messages.list(finalThreadId);

    const latest = messages.data
      .filter(m => m.role === "assistant")
      .pop();

    let replyText = "…";

    if (latest?.content?.[0]?.text?.value) {
      replyText = latest.content[0].text.value;
    }

    return res.status(200).json({
      threadId: finalThreadId,
      reply: replyText
    });

  } catch (err) {
    console.error("CHAT ENDPOINT ERROR:", err);
    return res.status(500).json({ error: "Chat endpoint failure." });
  }
}




