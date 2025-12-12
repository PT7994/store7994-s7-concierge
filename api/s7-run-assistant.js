// s7-run-assistant.js
// Fully handles Assistant run + function calls

import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required." });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const { threadId, assistantId } = req.body;

    if (!threadId || !assistantId) {
      return res.status(400).json({
        error: "Missing threadId or assistantId."
      });
    }

    // 1. Start run
    let run = await client.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });

    // 2. Poll run until completed OR function call
    while (true) {
      await new Promise(r => setTimeout(r, 1200));
      run = await client.beta.threads.runs.retrieve(threadId, run.id);

      if (run.status === "completed") break;

      if (run.status === "requires_action") {
        const call = run.required_action.submit_tool_outputs.tool_calls[0];

        if (!call) break;

        // 3. Handle function call → call the correct API
        let output = null;

        if (call.function.name === "searchProducts") {
          const searchRes = await fetch(
            `${process.env.S7_BASE_URL}/api/s7-search-products`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: call.function.arguments
            }
          );

          output = await searchRes.text(); // return raw JSON string
        }

        // 4. Send tool output back to OpenAI
        await client.beta.threads.runs.submitToolOutputs(threadId, run.id, {
          tool_outputs: [
            {
              tool_call_id: call.id,
              output: output || "{}"
            }
          ]
        });
      }
    }

    // 5. Get updated assistant message
    const messages = await client.beta.threads.messages.list(threadId);
    const latest = messages.data.filter(m => m.role === "assistant").pop();

    let reply = "…";

    if (latest?.content?.[0]?.text?.value) {
      reply = latest.content[0].text.value;
    }

    res.status(200).json({
      threadId,
      reply
    });

  } catch (err) {
    console.error("RUN ERROR:", err);
    res.status(500).json({ error: "Assistant run failure." });
  }
}
}
