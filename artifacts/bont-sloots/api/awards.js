export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const { fixtureId, playerId, type } = req.body || {};

  if (!fixtureId || !playerId || !type) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }

  console.log("AWARD:", { fixtureId, playerId, type });

  res.status(200).json({ success: true });
}
