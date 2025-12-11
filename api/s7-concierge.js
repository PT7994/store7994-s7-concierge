// s7-concierge.js
// Unified endpoint with CORS enabled

import OpenAI from "openai";

export default async function handler(req, res) {
  // --- CORS FIX ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // -----------------

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method." });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let { threadId, message, assistantId } = req.body;

    if (!assistantId) {
      return res.status(400).json({ error: "Missing assistantId." });
    }

    if (!message) {
      return res.status(400).json({ error: "Missing message." });
    }

    // 1. Create thread if missing
    if (!threadId) {
      const thread = await client.beta.threads.create();
      threadId = thread.id;
    }

    // 2. Send user message
    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    // 3. Run assistant
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });

    // 4. Poll until complete
    let runStatus = run.status;

    while (runStatus !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const currentRun = await client.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = currentRun.status;

      if (runStatus === "failed") {
        return res.status(500).json({ error: "Assistant run failed." });
      }
    }

    // 5. Get messages
    const messages = await client.beta.threads.messages.list(threadId);
    const assistantReply =
      messages.data.filter(msg => msg.role === "assistant").pop();

    res.status(200).json({
      status: "success",
      threadId,
      assistantReply: assistantReply?.content ?? null,
      messages: messages.data
    });

  } catch (error) {
    console.error("CONCIERGE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
}



