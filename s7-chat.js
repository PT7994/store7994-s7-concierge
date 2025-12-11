import OpenAI from "openai";

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // --------------

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST required." });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const body = JSON.parse(req.body || "{}");
    const { message, threadId } = body;

    if (!threadId) {
      return res.status(400).json({ error: "Missing threadId" });
    }
    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    // Add user message
    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    // Run assistant
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: process.env.ASSISTANT_ID
    });

    // Poll for run completion
    let status = run.status;
    while (status !== "completed") {
      await new Promise(r => setTimeout(r, 1000));

      const updated = await client.beta.threads.runs.retrieve(threadId, run.id);
      status = updated.status;

      if (status === "failed") {
        return res.status(500).json({ error: "Assistant run failed." });
      }
    }

    // Retrieve assistant message
    const messages = await client.beta.threads.messages.list(threadId);
    const reply = messages.data
      .filter(m => m.role === "assistant")
      .pop()?.content?.[0]?.text?.value;

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("S7-CHAT ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
