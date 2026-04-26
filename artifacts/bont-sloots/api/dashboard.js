export default function handler(req, res) {
  res.status(200).json({
    nextFixture: null,
    votingOpenFixture: null,
    totalSquadValue: 0,
    seasonRecord: {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0
    },
    topScorer: null,
    topLevel: null,
    recentResults: [],
    hallOfFame: {
      topScorer: null,
      topRated: null,
      mostMotms: null,
      muppetKing: null
    },
    squadPhotoUrl: null
  });
}
