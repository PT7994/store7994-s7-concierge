// S7 Product Search endpoint — FIXED price handling + honest results

import fetch from "node-fetch";

export default async function handler(req, res) {

  // ----- CORS -----
  res.setHeader("Access-Control-Allow-Origin", "https://store7994.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  // -----------------

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required" });
  }

  try {
    const { query = "" } = req.body;

    // -----------------------------
    // 1. Extract price limit (if any)
    // -----------------------------
    let maxPrice = null;
    const priceMatch = query.replace(/,/g, "").match(/under\s*\$?(\d+)|\$?(\d+)/i);

    if (priceMatch) {
      maxPrice = parseFloat(priceMatch[1] || priceMatch[2]);
    }

    // -----------------------------
    // 2. Clean query for Shopify
    // -----------------------------
    const cleanQuery = query
      .replace(/under\s*\$?\d+/gi, "")
      .replace(/\$?\d+/g, "")
      .trim();

    const response = await fetch(
      `https://store7994.com/search/suggest.json?q=${encodeURIComponent(cleanQuery)}&resources[type]=product`
    );

    const data = await response.json();
    let products = data?.resources?.results?.products || [];

    // -----------------------------
    // 3. Normalize + price filter
    // -----------------------------
    let items = products.map(p => ({
      title: p.title,
      price: Number(p.price),
      image: p.image,
      url: `https://store7994.com${p.url}`
    }));

    if (maxPrice) {
      items = items.filter(p => !isNaN(p.price) && p.price <= maxPrice);
    }

    // -----------------------------
    // 4. Return HONEST results
    // -----------------------------
    if (items.length === 0) {
      return res.status(200).json({
        type: "products",
        items: [],
        message: "No matching products were found for this search."
      });
    }

    return res.status(200).json({
      type: "products",
      items
    });

  } catch (error) {
    console.error("SEARCH API ERROR:", error);
    return res.status(500).json({ error: "Search failure" });
  }
}
