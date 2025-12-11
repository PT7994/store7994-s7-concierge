// S7 Product Search endpoint with full CORS support

import fetch from "node-fetch";

export default async function handler(req, res) {

  // ----- CORS FIX -----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  // ---------------------

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required" });
  }

  try {
    const { query } = req.body;

    const response = await fetch(
      `https://store7994.com/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product`
    );

    const data = await response.json();
    const products = data.resources.results.products || [];

    const formatted = products.map(p => ({
      title: p.title,
      price: p.price,
      image: p.image,
      url: `https://store7994.com/products/${p.handle}`
    }));

    res.status(200).json({
      type: "products",
      items: formatted
    });

  } catch (error) {
    console.error("SEARCH API ERROR:", error);
    res.status(500).json({ error: "Search failure" });
  }
}
