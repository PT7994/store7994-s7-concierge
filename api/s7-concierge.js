// s7-concierge.js
// Unified endpoint that handles the full AI concierge interaction
// 1) Create thread (if missing)
// 2) Send user message
// 3) Run assistant
// 4) Poll until run completes
// 5) Return assistant's reply

import OpenAI from "openai";

export default async function handler(req, res) {
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

    // 1. Create a thread if not provided
    if (!threadId) {
      const thread = await client.beta.threads.create();
      threadId = thread.id;
    }

    // 2. Send user message into the thread
    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    // 3. Run the assistant
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });

    // 4. Poll until run completes
    let runStatus = run.status;

    while (runStatus !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 1200)); // Wait 1.2 seconds
      const currentRun = await client.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = currentRun.status;

      if (runStatus === "failed") {
        return res.status(500).json({ error: "Assistant run failed." });
      }
    }

    // 5. Retrieve messages
    const messages = await client.beta.threads.messages.list(threadId);

    // Get the latest assistant reply
    const assistantReply = messages.data
      .filter(msg => msg.role === "assistant")
      .pop();

    res.status(200).json({
      status: "success",
      threadId,
      assistantReply: assistantReply?.content || null,
      fullConversation: messages.data
    });

  } catch (error) {
    console.error("CONCIERGE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
}
