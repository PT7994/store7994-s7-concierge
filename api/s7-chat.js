// ==============================================
// S7 CHAT ENDPOINT — STABLE MODE (CHAT COMPLETIONS)
// No Assistants, no Responses API, no crashes
// ==============================================

import OpenAI from "openai";
import fetch from "node-fetch";

function extractSearchQuery(message) {
  return message
    .toLowerCase()
    .replace(
      /show me|find|looking for|search for|i want|please|can you|could you|recommend/g,
      ""
    )
    .trim();
}


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

    // ================================
// S7 INTENT MEMORY (SESSION-SAFE)
// ================================
let lastIntent = {
  brand: null,
  category: null
};

// Basic brand + category detection
const brandMatch = message.match(
  /(dolce\s*&?\s*gabbana|gucci|fendi|prada|chanel|dior|balenciaga|versace|givenchy|bottega)/i
);

const categoryMatch = message.match(
  /(heels|shoes|sneakers|boots|handbags|bags|pumps|sandals|hats|jackets|coats|watches|jewelry|earrings|bracelets|necklaces)/i
);

// Save intent if detected
if (brandMatch || categoryMatch) {
  lastIntent = {
    brand: brandMatch ? brandMatch[1] : lastIntent.brand,
    category: categoryMatch ? categoryMatch[1] : lastIntent.category
  };
}


    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // ---------- PRODUCT INTENT DETECTION ----------
    const productCategories = {
  fashion: /(bag|handbag|shoe|shoes|boot|boots|hat|hats|sneaker|sneakers|watch|watches|earring|earrings|bracelet|bracelets|necklace|necklaces|jewelry|ring|rings|pendant|pendants|hoodie|jacket|coat|wallet|belt)/i,

  brands: /(gucci|fendi|prada|cartier|chanel|dior|balenciaga|versace|givenchy|bottega|louis vuitton|lv)/i,

  electronics: /(laptop|laptops|notebook|computer|macbook|headphone|headphones|earphone|earphones|earbud|earbuds|audio|speaker|speakers|amplifier|amp|dac|turntable|hi[- ]?fi|sound system)/i,

  home: /(furniture|chair|chairs|table|tables|sofa|couch|lamp|lighting|rug|rugs|mirror|mirrors|home decor|decor|vase|shelf|shelves|art|wall art)/i,

  store7994: /(store\s*7994|s7|custom|wearable art)/i
};


const looksLikeProduct = Object.values(productCategories)
  .some(regex => regex.test(message));
// ================================
// FORCE SEARCH ON BROWSE INTENT
// ================================
const browseIntent = /(show me|see what|browse|what do you have|those|them)/i.test(message);

if (browseIntent && lastIntent.brand && lastIntent.category) {
  const forcedQuery = `${lastIntent.brand} ${lastIntent.category}`;

  const searchResponse = await fetch(
    "https://store7994-s7-concierge.vercel.app/api/s7-search-products",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: forcedQuery })
    }
  );

  const productJson = await searchResponse.json();

  return res.status(200).json({
    reply: productJson
  });
}


    // ---------- PRODUCT SEARCH ----------
if (looksLikeProduct) {

  const cleanQuery = extractSearchQuery(message);

  const searchResponse = await fetch(
    "https://store7994-s7-concierge.vercel.app/api/s7-search-products",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: cleanQuery })
    }
  );

  const productJson = await searchResponse.json();

  return res.status(200).json({
    reply: productJson
  });
}


    // ---------- TEXT RESPONSE (STABLE + IDENTITY SAFE) ----------
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages: [
        {
          role: "system",
          content: `
You are the S7 Concierge for STORE 7994.

Identity rules:
- Your name is "S7 Concierge".
- Never refer to yourself as ChatGPT, AI, assistant, or model.
- If asked who you are, respond: "I’m the S7 Concierge for STORE 7994."
- Do not mention OpenAI or underlying technology.

Behavior:
- Respond briefly and directly.
- No greetings.
- No filler.
- Focus only on fashion and shopping guidance.
`
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    return res.status(200).json({
      reply: completion.choices[0].message.content
    });

  } catch (err) {
    console.error("S7 CHAT ERROR:", err);
    return res.status(500).json({ error: "Chat failure." });
  }
}
