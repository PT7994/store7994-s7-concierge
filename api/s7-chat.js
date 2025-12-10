import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const { message, threadId } = JSON.parse(req.body);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: "asst_NmKYDW1h87isRpw1NlO7eJuF"
    });

    let runStatus;
    do {
      await new Promise(r => setTimeout(r, 500));
      runStatus = await client.beta.threads.runs.retrieve(threadId, run.id);
    } while (runStatus.status !== "completed");

    const messages = await client.beta.threads.messages.list(threadId);
    const lastMsg = messages.data[0].content[0].text.value;

    res.status(200).json({ reply: lastMsg });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Chat endpoint failure." });
  }
}

