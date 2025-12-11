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

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required" });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    // Use Shopify Collections API search
    const shopifyUrl = `https://store7994.com/search/suggest.json?q=${encodeURIComponent(
      query
    )}&resources[type]=product&resources[options][fields]=title,price,tag`;

    const response = await fetch(shopifyUrl);
    const data = await response.json();

    if (!data.resources?.results?.products?.length) {
      return res.status(200).json({
        type: "products",
        items: []
      });
    }

    // Map products to UI format for the concierge
    const items = data.resources.results.products.slice(0, 6).map(p => ({
      title: p.title,
      price: p.price,
      image: p.image,
      url: `https://store7994.com/products/${p.handle}`
    }));

    return res.status(200).json({
      type: "products",
      items
    });

  } catch (err) {
    console.error("SEARCH ERROR:", err);
    return res.status(500).json({ error: "Search failure", detail: err.message });
  }
}

