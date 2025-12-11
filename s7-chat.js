 // ---- S7 CHAT ENDPOINT (WORKING VERSION) ----

import OpenAI from "openai";

export default async function handler(req, res) {
  // --- CORS FIX (WORKS WITH SHOPIFY & VERCEL) ---
  res.setHeader("Access-Control-Allow-Origin", "https://store7994.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // -------------------------------------------------

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method." });
  }

  try {
    const { message, threadId } = JSON.parse(req.body || "{}");

    if (!message) {
      return res.status(400).json({ error: "Missing message." });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 1. Send user message
    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    // 2. Run assistant
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: "asst_NmKYDW1h87isRpw1NlO7eJuF"
    });

    // 3. Poll until ready
    let status = run.status;

    while (status !== "completed") {
      await new Promise(r => setTimeout(r, 1100));
      const updated = await client.beta.threads.runs.retrieve(threadId, run.id);
      status = updated.status;

      if (status === "failed") {
        throw new Error("Assistant run failed.");
      }
    }

    // 4. Read assistant reply
    const msgs = await client.beta.threads.messages.list(threadId);
    const last = msgs.data.find(m => m.role === "assistant");

    const reply =
      last?.content?.[0]?.text?.value ||
      "I'm here, but I could not generate a response.";

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("S7 CHAT ERROR:", err);
    return res.status(500).json({ error: "Chat endpoint failure." });
  }
}




