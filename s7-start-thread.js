import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Create a new thread
    const thread = await client.beta.threads.create();

    return res.status(200).json({
      threadId: thread.id
    });

  } catch (err) {
    console.error("ERROR /s7-start-thread:", err);
    return res.status(500).json({ error: err.message });
  }
}
