export const TMA_CONFIG = {
  LAUNCH_AT: "2026-08-09T14:00:00.000Z",
  SEASON_AT: "2026-08-14T19:00:00.000Z",
  MAX_TICKETS_PER_USER: 25,
  PREMIER_LEAGUE_CLUBS: [
    { name: "Arsenal", shortName: "ARS" },
    { name: "Aston Villa", shortName: "AVL" },
    { name: "Bournemouth", shortName: "BOU" },
    { name: "Brentford", shortName: "BRE" },
    { name: "Brighton & Hove Albion", shortName: "BHA" },
    { name: "Chelsea", shortName: "CHE" },
    { name: "Crystal Palace", shortName: "CRY" },
    { name: "Everton", shortName: "EVE" },
    { name: "Fulham", shortName: "FUL" },
    { name: "Ipswich Town", shortName: "IPS" },
    { name: "Leicester City", shortName: "LEI" },
    { name: "Liverpool", shortName: "LIV" },
    { name: "Manchester City", shortName: "MCI" },
    { name: "Manchester United", shortName: "MUN" },
    { name: "Newcastle United", shortName: "NEW" },
    { name: "Nottingham Forest", shortName: "NFO" },
    { name: "Southampton", shortName: "SOU" },
    { name: "Tottenham Hotspur", shortName: "TOT" },
    { name: "West Ham United", shortName: "WHU" },
    { name: "Wolverhampton Wanderers", shortName: "WOL" },
  ],
} as const

export function getPublicTmaConfig() {
  return {
    launchAt: TMA_CONFIG.LAUNCH_AT,
    seasonAt: TMA_CONFIG.SEASON_AT,
    maxTicketsPerUser: TMA_CONFIG.MAX_TICKETS_PER_USER,
    clubs: TMA_CONFIG.PREMIER_LEAGUE_CLUBS.map((club) => ({
      name: club.name,
      shortName: club.shortName,
    })),
  }
}
