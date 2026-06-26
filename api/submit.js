export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const { name, email, need, language } = req.body;

  try {
    await fetch("https://script.google.com/macros/s/AKfycbxrS0u4Zz0Hx-M71a0CS32YEwfaWQzWJwlke3p9cQovFfdVGkBu2CUCxBpNAp8KT7WV/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, need, language }),
      redirect: "follow"
    });

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}