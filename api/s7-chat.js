// ==============================================
// S7 CHAT ENDPOINT — RESPONSES API (ROLLBACK)
// Deterministic, no greetings, no threads
// ==============================================

import OpenAI from "openai";
import fetch from "node-fetch";

export default async function handler(req, res) {

  // ---------- CORS ----------
  res.setHeader("Access-Control-Allow-Origin", "https://store7994.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  // --------------------------

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required." });
  }

  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required." });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // ---------- BASIC INTENT CHECK ----------
    const looksLikeProduct =
      /(bag|handbag|shoe|shoes|boot|boots|hat|hats|sneaker|sneakers|gucci|fendi|prada|leather|dress|jacket|coat|wallet|belt)/i
        .test(message);

    // ---------- IF PRODUCT → SEARCH ----------
    if (looksLikeProduct) {
      const searchResponse = await fetch(
        "https://store7994-s7-concierge.vercel.app/api/s7-search-products",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: message })
        }
      );

      const productJson = await searchResponse.json();

      return res.status(200).json({
        reply: JSON.stringify(productJson)
      });
    }

    // ---------- OTHERWISE: SHORT AI RESPONSE ----------
    const response = await client.responses.create({
      model: "gpt-4.1-2025-04-14",
      input: [
        {
          role: "system",
          content: "Respond briefly and directly. Do not greet. Do not use filler."
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    return res.status(200).json({
      reply: response.output_text || ""
    });

  } catch (err) {
    console.error("S7 CHAT ERROR:", err);
    return res.status(500).json({ error: "Chat failure." });
  }
}




