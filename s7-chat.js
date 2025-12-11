// VERSION 3 TEST

import OpenAI from "openai";

export default async function handler(req, res) {
  // --- CORS FIX ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // -----------------

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required." });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { message, threadId } = JSON.parse(req.body);

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }
    if (!threadId) {
      return res.status(400).json({ error: "Missing threadId" });
    }

    // Send message
    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    // Run assistant
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: process.env.ASSISTANT_ID
    });

    // Poll for completion
    let status = run.status;
    while (status !== "completed") {
      await new Promise(r => setTimeout(r, 1200));
      const updated = await client.beta.threads.runs.retrieve(threadId, run.id);
      status = updated.status;

      if (status === "failed") {
        return res.status(500).json({ error: "Assistant run failed." });
      }
    }

    // Retrieve messages
    const list = await client.beta.threads.messages.list(threadId);
    const reply = list.data.find(m => m.role === "assistant");

    return res.status(200).json({
      reply: reply?.content?.[0]?.text?.value || "No reply produced.",
      threadId
    });

  } catch (err) {
    console.error("S7 CHAT ERROR:", err);
    return res.status(500).json({
      error: err?.message || "Chat endpoint failure.",
      stack: err?.stack || null
    });
  }
}


