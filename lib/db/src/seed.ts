import { sql } from "drizzle-orm";
import { db } from "./index";
import { seasonsTable } from "./schema";

export async function seedIfEmpty() {
  const existing = await db.select().from(seasonsTable).limit(1);
  if (existing.length > 0) {
    return;
  }

  console.log("[seed] Database is empty — seeding initial data...");

  await db.execute(sql`
    INSERT INTO seasons (id, name, start_date, end_date, is_current, created_at) VALUES
    (1, 'Season 21', '2026-03-29', '2026-07-12', true, '2026-04-05 13:17:08.922505+00')
  `);
  await db.execute(sql`SELECT setval('seasons_id_seq', (SELECT MAX(id) FROM seasons))`);

  await db.execute(sql`
    INSERT INTO players (id, name, position, scouting_profile, photo_url, created_at) VALUES
    (45, 'Curls', 'GK', 'The heartbeat of our defensive line. A commanding presence who isn''t afraid to shout and organise the troops. His distribution is elite, often starting our attacks from the back. Just don''t ask him to save anything on the deck—if it''s below the knees, we''re in trouble.', '/objects/player-photos/curls_headshot_bf542fb5.jpg', '2026-04-05 15:25:10.724073+00'),
    (50, 'Ste Linney', 'FWD', 'A versatile natural goalscorer. Whether he''s leading the line as a #9 or driving the team forward from a deeper defensive role, he''s always a goal threat. Powerful on the ball and clinical when the chance falls to him.', '/objects/player-photos/ste_linney_headshot_342f2de4.jpg', '2026-04-05 15:25:10.724073+00'),
    (54, 'Smudge', 'DEF', 'The heartbeat of the Sloots. Leads by example with a high-intensity, aggressive style that sets the tone for the rest of the squad. Great feet, though his temper can occasionally boil over. Demands 100% excellence and won''t settle for anything less.', '/objects/player-photos/smudge_headshot_41283d7e.jpg', '2026-04-05 15:25:10.724073+00'),
    (55, 'Curt', 'FWD', 'The ultimate ''Mr. Consistent.'' You know exactly what you''re getting from Curt every single week: a 7/10 performance minimum. Versatile enough to operate anywhere on the pitch, he is the glue that keeps the Sloots'' tactical shape together.', '/objects/player-photos/curt_headshot_98991246.jpg', '2026-04-05 15:25:10.724073+00'),
    (56, 'Tommy', 'DEF', 'Nicknamed ''Inspector Gadget'' for a reason. He seems to have telescopic legs that intercept balls no one else can reach. Extremely strong in the 50/50s and provides a level of solidity that allows our creative players to roam free.', '/objects/player-photos/tommy_headshot_f6cbe7a3.jpg', '2026-04-05 15:25:10.724073+00'),
    (58, 'Fowkes', 'FWD', 'Electric pace and a constant threat on the counter-attack. He loves taking his man on and stretching the play. If we can sharpen up his finishing in front of goal, he''ll be one of the most lethal assets in the Staveley Premier Division.', '/objects/player-photos/fowkes_headshot_fa77d8db.jpg', '2026-04-05 16:31:10.391896+00'),
    (59, 'Tudge', 'FWD', 'A playmaker who thrives on the ball. Despite carrying a few ''extra pounds'' of experience, his technical ability is undeniable. He creates chances out of nothing and will be a massive loss to the Sloots'' creativity when his overseas transfer goes through.', '/objects/player-photos/tudge_headshot_2c3bdd54.jpg', '2026-04-05 16:31:42.311636+00'),
    (60, 'Traff', 'MID', 'Cool, calm, and collected. His close control in tight areas is a joy to watch, and he has a highlight reel full of ''worldie'' strikes. Just keep him away from the penalty spot—it''s the only time his legendary composure seems to desert him.', '/objects/player-photos/traff_headshot_e308c05c.jpg', '2026-04-05 16:32:08.95035+00'),
    (61, 'Ben Lomas', 'MID', 'The most technically gifted player in the squad. His vision, passing, and dribbling are a level above, and he can pick a lock from anywhere. He''s not going to win any marathons, but with a right foot like that, he doesn''t need to run—he lets the ball do the work.', '/objects/player-photos/ben_lomas_headshot_89844598.jpg', '2026-04-05 16:32:40.143686+00'),
    (62, 'Ben Smith', 'MID', 'A steady, industrious operator who thrives on the dirty work. Loves a ''nibble'' at the opponent''s heels to disrupt their rhythm. Puts in the hard yards every game, though we''re still waiting for him to find his shooting boots and add more goals to his tally.', '/objects/player-photos/ben_smith_headshot_c3accbf4.jpg', '2026-04-05 16:33:01.97269+00'),
    (63, 'Tom Austin', 'MID', 'The lungs of the team. A relentless pressing machine who refuses to let the opposition settle on the ball. His work rate is unmatched, and his ability to chip in with crucial goals from midfield makes him a nightmare to track.', '/objects/player-photos/tom_austin_headshot_6a9d2212.jpg', '2026-04-05 16:33:47.409683+00'),
    (64, 'Chris', 'DEF', 'Pure, unadulterated ''Brexit'' defending. The physical steel every successful side needs. He doesn''t care about the highlights; he cares about the clean sheet and leaving the opposition striker in a heap. A brick wall in the heart of the defence.', '/objects/player-photos/chris_headshot_2286cf37.jpg', '2026-04-05 16:34:21.627747+00'),
    (65, 'Turner', 'DEF', 'The General. Comfortable dropping into the backline or sitting in the hole to dictate play. Boasts a fantastic passing range and reads the game two steps ahead of the opposition. Never shies away from a crunching tackle when the game gets physical.', '/objects/player-photos/turner_headshot_ea2498cf.jpg', '2026-04-05 16:34:40.34148+00'),
    (66, 'Dave H', 'MID', NULL, NULL, '2026-04-05 16:51:32.927127+00')
  `);
  await db.execute(sql`SELECT setval('players_id_seq', (SELECT MAX(id) FROM players))`);

  await db.execute(sql`
    INSERT INTO fixtures (id, opponent, match_date, kickoff_time, kickoff_tbc, home_score, away_score, played, is_home, venue, notes, season_id, voting_closes_at, created_at) VALUES
    (6,  'Unathletic Bilbao', '2026-03-29', '18:30', false, 1, 1, true,  true, 'Staveley Miners Welfare 3G', NULL, 1, NULL, '2026-04-05 12:58:33.020257+00'),
    (11, 'Getting Old FC',    '2026-03-22', '18:30', false, 1, 5, true,  true, 'Staveley Miners Welfare 3G', NULL, NULL, NULL, '2026-04-05 13:38:51.095046+00'),
    (12, 'Studs FC',          '2026-04-12', NULL,    true,  NULL, NULL, false, true, NULL, NULL, 1, NULL, '2026-04-05 15:37:19.835233+00'),
    (13, 'ADH FC',            '2026-04-19', NULL,    true,  NULL, NULL, false, true, NULL, NULL, 1, NULL, '2026-04-05 15:37:19.867231+00'),
    (14, 'S20 Athletic',      '2026-04-26', NULL,    true,  NULL, NULL, false, true, NULL, NULL, 1, NULL, '2026-04-05 15:37:19.870992+00'),
    (15, 'Rods Out FC',       '2026-05-10', NULL,    true,  NULL, NULL, false, true, NULL, NULL, 1, NULL, '2026-04-05 15:37:19.875334+00'),
    (16, 'Intermigran FC',    '2026-05-17', NULL,    true,  NULL, NULL, false, true, NULL, NULL, 1, NULL, '2026-04-05 15:37:19.87858+00'),
    (17, 'Studs FC',          '2026-05-31', NULL,    true,  NULL, NULL, false, true, NULL, NULL, 1, NULL, '2026-04-05 15:37:19.881062+00'),
    (18, 'Unathletic Bilbao', '2026-06-07', NULL,    true,  NULL, NULL, false, true, NULL, NULL, 1, NULL, '2026-04-05 15:37:19.883945+00'),
    (19, 'ADH FC',            '2026-06-14', NULL,    true,  NULL, NULL, false, true, NULL, NULL, 1, NULL, '2026-04-05 15:37:19.88689+00'),
    (20, 'S20 Athletic',      '2026-06-21', NULL,    true,  NULL, NULL, false, true, NULL, NULL, 1, NULL, '2026-04-05 15:37:19.889944+00'),
    (21, 'Rods Out FC',       '2026-06-28', NULL,    true,  NULL, NULL, false, true, NULL, NULL, 1, NULL, '2026-04-05 15:37:19.893406+00'),
    (22, 'Getting Old FC',    '2026-07-05', NULL,    true,  NULL, NULL, false, true, NULL, NULL, 1, NULL, '2026-04-05 15:37:19.896191+00'),
    (23, 'Intermigran FC',    '2026-07-12', NULL,    true,  NULL, NULL, false, true, NULL, NULL, 1, NULL, '2026-04-05 15:37:19.899339+00')
  `);
  await db.execute(sql`SELECT setval('fixtures_id_seq', (SELECT MAX(id) FROM fixtures))`);

  await db.execute(sql`
    INSERT INTO fixture_players (id, fixture_id, player_id, present, created_at) VALUES
    (1,  11, 45, true,  '2026-04-05 16:15:12.143231+00'),
    (2,  11, 55, true,  '2026-04-05 16:15:12.179273+00'),
    (3,  11, 54, true,  '2026-04-05 16:15:12.182796+00'),
    (4,  11, 50, true,  '2026-04-05 16:15:12.185825+00'),
    (5,  11, 56, true,  '2026-04-05 16:15:12.189484+00'),
    (6,  6,  45, true,  '2026-04-05 16:15:36.92303+00'),
    (7,  6,  55, true,  '2026-04-05 16:15:36.926729+00'),
    (8,  6,  54, true,  '2026-04-05 16:15:36.929746+00'),
    (9,  6,  50, false, '2026-04-05 16:15:36.93254+00'),
    (10, 6,  56, true,  '2026-04-05 16:15:36.935989+00'),
    (24, 11, 61, false, '2026-04-05 16:51:15.934942+00'),
    (25, 11, 62, true,  '2026-04-05 16:51:15.939125+00'),
    (26, 11, 64, true,  '2026-04-05 16:51:15.943185+00'),
    (27, 11, 58, false, '2026-04-05 16:51:15.954561+00'),
    (28, 11, 63, false, '2026-04-05 16:51:15.964449+00'),
    (29, 11, 60, false, '2026-04-05 16:51:15.970166+00'),
    (30, 11, 59, false, '2026-04-05 16:51:15.972868+00'),
    (31, 11, 65, false, '2026-04-05 16:51:15.976628+00'),
    (32, 6,  61, false, '2026-04-05 16:51:51.740009+00'),
    (33, 6,  62, true,  '2026-04-05 16:51:51.744473+00'),
    (34, 6,  64, true,  '2026-04-05 16:51:51.748185+00'),
    (35, 6,  66, true,  '2026-04-05 16:51:51.759334+00'),
    (36, 6,  58, true,  '2026-04-05 16:51:51.762115+00'),
    (37, 6,  63, false, '2026-04-05 16:51:51.772385+00'),
    (38, 6,  60, false, '2026-04-05 16:51:51.779153+00'),
    (39, 6,  59, true,  '2026-04-05 16:51:51.781551+00'),
    (40, 6,  65, false, '2026-04-05 16:51:51.784887+00'),
    (41, 11, 66, false, '2026-04-05 17:19:02.406563+00')
  `);
  await db.execute(sql`SELECT setval('fixture_players_id_seq', (SELECT MAX(id) FROM fixture_players))`);

  await db.execute(sql`
    INSERT INTO stats (id, player_id, fixture_id, type, created_at) VALUES
    (23, 55, 6,  'goal',   '2026-04-05 16:07:58.279239+00'),
    (24, 50, 11, 'goal',   '2026-04-05 16:08:29.057963+00'),
    (25, 54, 11, 'assist', '2026-04-05 21:40:10.032393+00'),
    (26, 66, 6,  'assist', '2026-04-05 21:40:23.912341+00')
  `);
  await db.execute(sql`SELECT setval('stats_id_seq', (SELECT MAX(id) FROM stats))`);

  await db.execute(sql`
    INSERT INTO awards (id, player_id, fixture_id, type, created_at) VALUES
    (19, 56, 11, 'mom', '2026-04-05 21:41:38.71655+00'),
    (22, 66, 6,  'mom', '2026-04-06 11:14:47.73051+00')
  `);
  await db.execute(sql`SELECT setval('awards_id_seq', (SELECT MAX(id) FROM awards))`);

  await db.execute(sql`
    INSERT INTO player_ratings (id, fixture_id, player_id, rating, created_at) VALUES
    (1,  11, 45, 7.0, '2026-04-05 17:23:37.541304+00'),
    (2,  11, 50, 7.0, '2026-04-05 17:23:37.58387+00'),
    (3,  11, 54, 7.0, '2026-04-05 17:23:37.587882+00'),
    (4,  11, 55, 6.0, '2026-04-05 17:23:37.59176+00'),
    (5,  11, 56, 7.5, '2026-04-05 17:23:37.595445+00'),
    (6,  11, 62, 5.0, '2026-04-05 17:23:37.598305+00'),
    (7,  11, 64, 5.0, '2026-04-05 17:23:37.602016+00'),
    (8,  6,  45, 7.0, '2026-04-05 17:24:55.470571+00'),
    (9,  6,  54, 7.0, '2026-04-05 17:24:55.504443+00'),
    (10, 6,  55, 8.0, '2026-04-05 17:24:55.508008+00'),
    (11, 6,  56, 7.5, '2026-04-05 17:24:55.511542+00'),
    (12, 6,  58, 7.5, '2026-04-05 17:24:55.515104+00'),
    (13, 6,  59, 7.5, '2026-04-05 17:24:55.518846+00'),
    (14, 6,  62, 7.5, '2026-04-05 17:24:55.521937+00'),
    (15, 6,  64, 7.0, '2026-04-05 17:24:55.525429+00'),
    (16, 6,  66, 8.5, '2026-04-05 17:24:55.528921+00')
  `);
  await db.execute(sql`SELECT setval('player_ratings_id_seq', (SELECT MAX(id) FROM player_ratings))`);

  await db.execute(sql`
    INSERT INTO player_value_changes (id, player_id, fixture_id, total_change, breakdown, is_king, created_at, updated_at) VALUES
    (1,  62, 11, -400000, '[{"label":"Appearance Fee","amount":100000},{"label":"Loss Penalty","amount":-200000},{"label":"Passenger Tax","amount":-300000}]',                                                                                                                          false, '2026-04-05 18:08:02.601895+00', '2026-04-05 21:41:38.724+00'),
    (2,  64, 11, -100000, '[{"label":"Appearance Fee","amount":100000},{"label":"Loss Penalty","amount":-200000},{"label":"Dead Zone (5 conceded)","amount":0}]',                                                                                                                    false, '2026-04-05 18:08:02.636025+00', '2026-04-05 21:41:38.736+00'),
    (3,  45, 11, -100000, '[{"label":"Appearance Fee","amount":100000},{"label":"Loss Penalty","amount":-200000},{"label":"Dead Zone (5 conceded)","amount":0}]',                                                                                                                    false, '2026-04-05 18:08:02.640163+00', '2026-04-05 21:41:38.739+00'),
    (4,  55, 11, -650000, '[{"label":"Appearance Fee","amount":100000},{"label":"Loss Penalty","amount":-200000},{"label":"Passenger Tax","amount":-300000},{"label":"Rating 6 — Poor","amount":-250000}]',                                                                          false, '2026-04-05 18:08:02.643216+00', '2026-04-05 21:41:38.742+00'),
    (5,  54, 11,  100000, '[{"label":"Appearance Fee","amount":100000},{"label":"Loss Penalty","amount":-200000},{"label":"Assist (DEF/GK)","amount":200000},{"label":"Dead Zone (5 conceded)","amount":0}]',                                                                        false, '2026-04-05 18:08:02.64668+00',  '2026-04-05 21:41:38.745+00'),
    (6,  50, 11,  400000, '[{"label":"Appearance Fee","amount":100000},{"label":"Loss Penalty","amount":-200000},{"label":"Goal (MID/FWD)","amount":500000}]',                                                                                                                       false, '2026-04-05 18:08:02.649572+00', '2026-04-05 21:41:38.748+00'),
    (7,  56, 11, 1150000, '[{"label":"Appearance Fee","amount":100000},{"label":"Loss Penalty","amount":-200000},{"label":"Dead Zone (5 conceded)","amount":0},{"label":"Rating 7.5 — Good","amount":250000},{"label":"Man of the Match","amount":1000000}]',                         false, '2026-04-05 18:08:02.652511+00', '2026-04-05 21:41:38.751+00'),
    (8,  62, 6,   450000, '[{"label":"Appearance Fee","amount":100000},{"label":"Draw Bonus","amount":100000},{"label":"Rating 7.5 — Good","amount":250000}]',                                                                                                                       false, '2026-04-05 18:08:02.660213+00', '2026-04-06 11:14:47.737+00'),
    (9,  64, 6,   700000, '[{"label":"Appearance Fee","amount":100000},{"label":"Draw Bonus","amount":100000},{"label":"Elite Defence (1 conceded)","amount":500000}]',                                                                                                              false, '2026-04-05 18:08:02.663376+00', '2026-04-06 11:14:47.74+00'),
    (10, 45, 6,   700000, '[{"label":"Appearance Fee","amount":100000},{"label":"Draw Bonus","amount":100000},{"label":"Elite Defence (1 conceded)","amount":500000}]',                                                                                                              false, '2026-04-05 18:08:02.666838+00', '2026-04-06 11:14:47.742+00'),
    (11, 55, 6,   950000, '[{"label":"Appearance Fee","amount":100000},{"label":"Draw Bonus","amount":100000},{"label":"Goal (MID/FWD)","amount":500000},{"label":"Rating 8 — Good","amount":250000}]',                                                                              false, '2026-04-05 18:08:02.670007+00', '2026-04-06 11:14:47.745+00'),
    (12, 66, 6,  1750000, '[{"label":"Appearance Fee","amount":100000},{"label":"Draw Bonus","amount":100000},{"label":"Assist (MID/FWD)","amount":300000},{"label":"Rating 8.5 — Good","amount":250000},{"label":"Man of the Match","amount":1000000}]',                             false, '2026-04-05 18:08:02.672338+00', '2026-04-06 11:14:47.748+00'),
    (13, 58, 6,   450000, '[{"label":"Appearance Fee","amount":100000},{"label":"Draw Bonus","amount":100000},{"label":"Rating 7.5 — Good","amount":250000}]',                                                                                                                       false, '2026-04-05 18:08:02.674696+00', '2026-04-06 11:14:47.75+00'),
    (14, 54, 6,   700000, '[{"label":"Appearance Fee","amount":100000},{"label":"Draw Bonus","amount":100000},{"label":"Elite Defence (1 conceded)","amount":500000}]',                                                                                                              false, '2026-04-05 18:08:02.678252+00', '2026-04-06 11:14:47.753+00'),
    (15, 56, 6,   950000, '[{"label":"Appearance Fee","amount":100000},{"label":"Draw Bonus","amount":100000},{"label":"Elite Defence (1 conceded)","amount":500000},{"label":"Rating 7.5 — Good","amount":250000}]',                                                                false, '2026-04-05 18:08:02.681783+00', '2026-04-06 11:14:47.755+00'),
    (16, 59, 6,   450000, '[{"label":"Appearance Fee","amount":100000},{"label":"Draw Bonus","amount":100000},{"label":"Rating 7.5 — Good","amount":250000}]',                                                                                                                       false, '2026-04-05 18:08:02.684732+00', '2026-04-06 11:14:47.758+00')
  `);
  await db.execute(sql`SELECT setval('player_value_changes_id_seq', (SELECT MAX(id) FROM player_value_changes))`);

  await db.execute(sql`
    INSERT INTO player_comments (id, player_id, comment, created_at) VALUES
    (1, 56, 'Nearly had the game of his life against Getting Old!', '2026-04-05 16:46:50.463268+00')
  `);
  await db.execute(sql`SELECT setval('player_comments_id_seq', (SELECT MAX(id) FROM player_comments))`);

  await db.execute(sql`
    INSERT INTO settings (key, value, updated_at) VALUES
    ('scout_ai_summary_studs_fc', '{"summary":"Studs FC aren''t here for a kickabout — they''re top of the league and playing like proper title contenders. Two games, two wins, and they''ve set the early pace while everyone else is still finding their lungs. No head-to-head history means no freebies, no \"we''ve had them before\" comfort blanket — this is a clean slate against the current front-runners.\n\nThey look like the full package: 11 goals scored and only 3 conceded for a +8 goal difference. That''s not just one lucky battering — that''s a team that can hurt you going forward and still keep the door fairly shut at the back. If you switch off for even a minute, they''ve shown they''ve got the finishing to punish it, and if you''re sloppy in possession they''ll likely turn it into chances fast.\n\nFor us, form says it''s a tough ask right now: a 1-1 draw then a 1-5 loss means we''ve shipped 6 in two and can''t afford another open-house defending session. A Bont Sloots win is definitely possible in 6-a-side chaos, but it''ll come from being streetwise — don''t get dragged into a shootout, don''t gift them transitions, and don''t let them build confidence early. Keep it tight, keep it simple, and make them work for every single goal — because if you let them get rolling, they''ve already proved they can run up numbers.","generatedAt":"2026-04-06T12:37:26.632Z"}', '2026-04-06 12:37:26.632+00')
    ON CONFLICT (key) DO NOTHING
  `);

  console.log("[seed] Database seeded successfully.");
}
