export const TMA_CONFIG = {
  // Sunday, 16 August 2026 at 3:00 PM BST (UTC+1).
  LAUNCH_AT: "2026-08-16T14:00:00.000Z",
  // Friday, 21 August 2026 at 8:00 PM BST (UTC+1).
  SEASON_AT: "2026-08-21T19:00:00.000Z",
  MAX_TICKETS_PER_USER: 25,
  PREMIER_LEAGUE_CLUBS: [
    { name: "AFC Bournemouth", shortName: "BOU" },
    { name: "Arsenal FC", shortName: "ARS" },
    { name: "Aston Villa", shortName: "AVL" },
    { name: "Brentford FC", shortName: "BRE" },
    { name: "Brighton & Hove Albion", shortName: "BHA" },
    { name: "Chelsea FC", shortName: "CHE" },
    { name: "Coventry City", shortName: "COV" },
    { name: "Crystal Palace", shortName: "CRY" },
    { name: "Everton FC", shortName: "EVE" },
    { name: "Fulham FC", shortName: "FUL" },
    { name: "Hull City", shortName: "HUL" },
    { name: "Ipswich Town", shortName: "IPS" },
    { name: "Leeds United", shortName: "LEE" },
    { name: "Liverpool FC", shortName: "LIV" },
    { name: "Manchester City", shortName: "MCI" },
    { name: "Manchester United", shortName: "MUN" },
    { name: "Newcastle United", shortName: "NEW" },
    { name: "Nottingham Forest", shortName: "NFO" },
    { name: "Sunderland AFC", shortName: "SUN" },
    { name: "Tottenham Hotspur", shortName: "TOT" },
  ],
} as const

export function getPublicTmaConfig() {
  return {
    launchAt: TMA_CONFIG.LAUNCH_AT,
    seasonAt: TMA_CONFIG.SEASON_AT,
    /**
     * Time left until kickoff, measured server-side. The Mini App counts down
     * from this rather than comparing LAUNCH_AT against the device clock,
     * which can be wrong by hours.
     */
    msUntilLaunch: Math.max(
      0,
      new Date(TMA_CONFIG.LAUNCH_AT).getTime() - Date.now(),
    ),
    maxTicketsPerUser: TMA_CONFIG.MAX_TICKETS_PER_USER,
    clubs: TMA_CONFIG.PREMIER_LEAGUE_CLUBS.map((club) => ({
      name: club.name,
      shortName: club.shortName,
    })),
  }
}
