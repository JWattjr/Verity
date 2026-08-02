export const PRELAUNCH_CONFIG = Object.freeze({
  // Replace this value when the exact Community Shield kickoff is confirmed.
  LAUNCH_AT: new Date("2026-08-16T15:00:00.000Z"),
  SEASON_AT: new Date("2026-08-21T19:00:00.000Z"),
  MAX_TICKETS_PER_USER: 25,
  PREMIER_LEAGUE_CLUBS: [
    { name: "Arsenal", shortName: "ARS" },
    { name: "Aston Villa", shortName: "AVL" },
    { name: "Bournemouth", shortName: "BOU" },
    { name: "Brentford", shortName: "BRE" },
    { name: "Brighton & Hove Albion", shortName: "BHA" },
    { name: "Chelsea", shortName: "CHE" },
    { name: "Coventry City", shortName: "COV" },
    { name: "Crystal Palace", shortName: "CRY" },
    { name: "Everton", shortName: "EVE" },
    { name: "Fulham", shortName: "FUL" },
    { name: "Hull City", shortName: "HUL" },
    { name: "Ipswich Town", shortName: "IPS" },
    { name: "Leeds United", shortName: "LEE" },
    { name: "Liverpool", shortName: "LIV" },
    { name: "Manchester City", shortName: "MCI" },
    { name: "Manchester United", shortName: "MUN" },
    { name: "Newcastle United", shortName: "NEW" },
    { name: "Nottingham Forest", shortName: "NFO" },
    { name: "Sunderland", shortName: "SUN" },
    { name: "Tottenham Hotspur", shortName: "TOT" },
  ] as const,
})

export type PublicPrelaunchConfig = {
  launchAt: string
  seasonAt: string
  maxTicketsPerUser: number
  clubs: Array<{ name: string; shortName: string }>
}

export function getPublicPrelaunchConfig(): PublicPrelaunchConfig {
  return {
    launchAt: PRELAUNCH_CONFIG.LAUNCH_AT.toISOString(),
    seasonAt: PRELAUNCH_CONFIG.SEASON_AT.toISOString(),
    maxTicketsPerUser: PRELAUNCH_CONFIG.MAX_TICKETS_PER_USER,
    clubs: [...PRELAUNCH_CONFIG.PREMIER_LEAGUE_CLUBS],
  }
}
