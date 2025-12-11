import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { message, threadId } = JSON.parse(req.body);

    if (!threadId) {
      return res.status(400).json({ error: "Missing threadId" });
    }

    // 1. Create user message
    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    // 2. Run assistant
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: process.env.ASSISTANT_ID
    });

    // 3. Poll until run is complete
    let runStatus = run.status;

    while (runStatus !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const check = await client.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = check.status;

      if (runStatus === "failed") {
        return res.status(500).json({ error: "Assistant run failed." });
      }
    }

    // 4. Retrieve assistant reply
    const messages = await client.beta.threads.messages.list(threadId);
    const reply = messages.data
      .filter(m => m.role === "assistant")
      .pop()?.content?.[0]?.text?.value;

    return res.status(200).json({
      reply: reply || "I'm sorry, I couldn’t generate a response."
    });

  } catch (err) {
    console.error("ERROR /s7-chat:", err);
    return res.status(500).json({ error: err.message });
  }
}
