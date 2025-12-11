import OpenAI from "openai";

export default async function handler(req, res) {

  // --- CORS ALLOW Shopify Domain ---
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

    const { message, threadId } = JSON.parse(req.body || "{}");

    if (!message) {
      return res.status(400).json({ error: "Missing message." });
    }

    // 1. If no threadId, create one
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

    // 4. Poll until complete (simple polling)
    let runStatus = run.status;
    while (runStatus !== "completed") {
      await new Promise(r => setTimeout(r, 1000));
      const updatedRun = await client.beta.threads.runs.retrieve(finalThreadId, run.id);
      runStatus = updatedRun.status;

      if (runStatus === "failed") {
        return res.status(500).json({ error: "Assistant run failed." });
      }
    }

    // 5. Retrieve messages
    const msgs = await client.beta.threads.messages.list(finalThreadId);

    const reply = msgs.data
      .filter(m => m.role === "assistant")
      .pop()?.content?.[0]?.text?.value || "I'm sorry, I didn't understand.";

    return res.status(200).json({
      threadId: finalThreadId,
      reply
    });

  } catch (err) {
    console.error("S7-CHAT ERROR:", err);
    return res.status(500).json({ error: "Chat endpoint failure." });
  }

}


