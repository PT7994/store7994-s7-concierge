// s7-get-messages.js
// Checks run status + returns the assistant's latest reply

import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { threadId, runId } = req.body;

    if (!threadId || !runId) {
      return res.status(400).json({
        error: "Missing required fields: threadId and runId."
      });
    }

    // Check the status of the run
    const run = await client.beta.threads.runs.retrieve(threadId, runId);

    if (run.status !== "completed") {
      return res.status(200).json({
        status: "pending",
        runStatus: run.status
      });
    }

    // Run complete → Retrieve messages
    const messages = await client.beta.threads.messages.list(threadId);

    // Get the latest assistant message
    const assistantMessage = messages.data
      .filter(msg => msg.role === "assistant")
      .pop();

    res.status(200).json({
      status: "completed",
      assistantMessage: assistantMessage ? assistantMessage.content : null,
      fullMessages: messages.data
    });

  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);
    res.status(500).json({ error: error.message });
  }
}
