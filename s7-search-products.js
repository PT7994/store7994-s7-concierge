import fetch from "node-fetch";

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required." });
    }

  const { query } = req.body;

  if (!query || query.trim().length < 2) {
    return res.json({ type: "products", items: [] });
  }

  try {
    const url = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/products.json?title=${encodeURIComponent(query)}&limit=6`;

    const shopifyRes = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_KEY,
        "Content-Type": "application/json"
      }
    });

    const data = await shopifyRes.json();

    if (!data.products) {
      return res.json({ type: "products", items: [] });
    }

    const formatted = data.products.map(p => ({
      title: p.title,
      price: p.variants?.[0]?.price ? `$${p.variants[0].price}` : "—",
      image: p.image?.src || "",
      url: `https://store7994.com/products/${p.handle}`
    }));

    return res.json({
      type: "products",
      items: formatted
    });

  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ error: "Search failed." });
  }
}
