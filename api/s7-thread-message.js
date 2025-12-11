// s7-thread-message.js
// Sends a user message into an existing OpenAI thread

import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { threadId, message } = req.body;

    if (!threadId || !message) {
      return res.status(400).json({
        error: "Missing required fields: threadId and message."
      });
    }

    // Send the message into the thread
    const response = await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    res.status(200).json({
      status: "Message sent",
      threadId: threadId,
      messageId: response.id
    });

  } catch (error) {
    console.error("MESSAGE SEND ERROR:", error);
    res.status(500).json({ error: error.message });
  }
}
