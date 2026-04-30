export default async function handler(req, res) {
  try {
    const { opponent } = req.query;

    if (!opponent) {
      return res.status(400).json({ error: "opponent required" });
    }

    // TEMP TEST RESPONSE (we’ll replace this next)
    return res.status(200).json({
      name: opponent,
      rank: 1,
      gf: 10,
      ga: 5,
      form: "WWL",
      verdicts: ["Test Data"],
      teamUrl: "https://example.com",
      isOverride: false
    });

  } catch (error) {
    res.status(500).json({
      error: "Scout failed",
      message: error.message
    });
  }
}
