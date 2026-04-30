export default async function handler(req, res) {
  try {
    const { opponent } = req.query;

    if (!opponent) {
      return res.status(400).json({ error: "opponent required" });
    }

    const url = "https://staveley6aside.leaguerepublic.com/standingsForDate/177116197/2/-1/-1.html";

    const response = await fetch(url);
    const html = await response.text();

    // VERY SIMPLE scrape (just check opponent exists)
    const found = html.toLowerCase().includes(opponent.toLowerCase());

    if (!found) {
      return res.status(404).json({ error: "Team not found" });
    }

    return res.status(200).json({
      name: opponent,
      rank: 0,
      gf: 0,
      ga: 0,
      form: "???",
      verdicts: ["Scout coming soon"],
      teamUrl: url,
      isOverride: false
    });

  } catch (error) {
    res.status(500).json({
      error: "Scout failed",
      message: error.message
    });
  }
}
