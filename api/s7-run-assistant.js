// s7-run-assistant.js
// Runs the OpenAI assistant on a thread

import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { threadId, assistantId } = req.body;

    if (!threadId || !assistantId) {
      return res.status(400).json({
        error: "Missing required fields: threadId and assistantId."
      });
    }

    // Create a run to process the thread
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });

    res.status(200).json({
      status: "Run started",
      runId: run.id,
      threadId: threadId
    });

  } catch (error) {
    console.error("ASSISTANT RUN ERROR:", error);
    res.status(500).json({ error: error.message });
  }
}
