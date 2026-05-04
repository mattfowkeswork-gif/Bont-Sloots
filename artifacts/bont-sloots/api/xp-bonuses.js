export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const { playerId, amount, reason } = req.body || {};

  if (!playerId || !amount || !reason) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }

  console.log("XP BONUS:", { playerId, amount, reason });

  res.status(200).json({ success: true });
}
