// ==============================================
// S7 CHAT ENDPOINT — FUNCTION CALL VERSION (FINAL)
// Supports:
// - Assistant function calling
// - Shopify product search
// - JSON product card passthrough
// - Full CORS
// ==============================================

import OpenAI from "openai";
import fetch from "node-fetch";

export default async function handler(req, res) {

  // ---------- CORS ----------
  res.setHeader("Access-Control-Allow-Origin", "https://store7994.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // ---------------------------

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required." });
  }

  try {
    const { message, threadId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    let finalThreadId = threadId;

    // Create thread if missing
    if (!finalThreadId) {
      const newThread = await client.beta.threads.create();
      finalThreadId = newThread.id;
    }

    // Add user message
    await client.beta.threads.messages.create(finalThreadId, {
      role: "user",
      content: message
    });

    // Run assistant
    const run = await client.beta.threads.runs.create(finalThreadId, {
      assistant_id: process.env.ASSISTANT_ID
    });

    let status = run.status;
    let runData = run;

    // Poll until completed or requires_action
    while (status !== "completed" && status !== "requires_action") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runData = await client.beta.threads.runs.retrieve(finalThreadId, run.id);
      status = runData.status;
    }

    // -----------------------------------------
    // STEP 1 — ASSISTANT REQUESTED A FUNCTION?
    // -----------------------------------------
    if (status === "requires_action") {
      const tool = runData.required_action.submit_tool_outputs.tool_calls?.[0];

      if (tool?.function?.name === "searchProducts") {
        const q = JSON.parse(tool.function.arguments).query;

        // Call your Vercel product search endpoint
        const searchResponse = await fetch(
          "https://store7994-s7-concierge.vercel.app/api/s7-search-products",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: q })
          }
        );

        const productJson = await searchResponse.json();

        // Send the product results back to the assistant
        await client.beta.threads.runs.submitToolOutputs(finalThreadId, run.id, {
          tool_outputs: [
            {
              tool_call_id: tool.id,
              output: JSON.stringify(productJson)
            }
          ]
        });

        // Now fetch the assistant’s actual reply
        let completed = null;
        while (true) {
          await new Promise((r) => setTimeout(r, 1200));
          const check = await client.beta.threads.runs.retrieve(finalThreadId, run.id);
          if (check.status === "completed") {
            completed = check;
            break;
          }
        }

        const msgs = await client.beta.threads.messages.list(finalThreadId);
        const latest = msgs.data.filter(m => m.role === "assistant").pop();

        return res.status(200).json({
          threadId: finalThreadId,
          reply: latest?.content?.[0]?.text?.value || "",
        });
      }
    }

    // -----------------------------------------
    // STEP 2 — NORMAL TEXT RESPONSE
    // -----------------------------------------
    const messages = await client.beta.threads.messages.list(finalThreadId);

    const latest = messages.data
      .filter(m => m.role === "assistant")
      .pop();

    return res.status(200).json({
      threadId: finalThreadId,
      reply: latest?.content?.[0]?.text?.value || ""
    });

  } catch (err) {
    console.error("CHAT ENDPOINT ERROR:", err);
    return res.status(500).json({ error: "Chat endpoint failure." });
  }
}




