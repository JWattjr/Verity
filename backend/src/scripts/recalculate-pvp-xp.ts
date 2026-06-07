import "dotenv/config"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import mongoose, { Types } from "mongoose"
import {
  calculatePvpResultXp,
  calculatePvpScore,
} from "../modules/pvp/pvp-scoring"
import type { PvpResult } from "../modules/pvp/pvp-scoring"

type TicketRecord = {
  _id: Types.ObjectId
  userId: Types.ObjectId
  picks: Array<{ isCorrect: boolean | null }>
  doubleBoostActive?: boolean
  score?: number
  xpEarned?: number
}

type MatchRecord = {
  _id: Types.ObjectId
  ticket1Id: Types.ObjectId
  ticket2Id: Types.ObjectId
  user1Id: Types.ObjectId
  user2Id: Types.ObjectId
  winnerId?: Types.ObjectId | null
}

type UserTotals = {
  arenaXp: number
  pvpTicketsSubmittedCount: number
  pvpMatchesWonCount: number
  pvpMatchesLostCount: number
  pvpMatchesDrawnCount: number
}

type Snapshot = {
  createdAt: string
  database: string
  users: Array<UserTotals & { id: string; hasWonFirstPvpDuel: boolean }>
  tickets: Array<{ id: string; score: number; xpEarned: number }>
  matches: Array<{ id: string; winnerId: string | null }>
}

const applyChanges = process.argv.includes("--apply")
const rollbackArg = process.argv.find((arg) => arg.startsWith("--rollback="))
const mongoUri = process.env.MONGODB_URI

if (!mongoUri) {
  throw new Error("MONGODB_URI is required.")
}
const requiredMongoUri = mongoUri

function emptyTotals(): UserTotals {
  return {
    arenaXp: 0,
    pvpTicketsSubmittedCount: 0,
    pvpMatchesWonCount: 0,
    pvpMatchesLostCount: 0,
    pvpMatchesDrawnCount: 0,
  }
}

function resultFor(
  winnerId: Types.ObjectId | null,
  userId: Types.ObjectId,
): PvpResult {
  if (!winnerId) return "draw"
  return winnerId.equals(userId) ? "win" : "loss"
}

function addResult(totals: UserTotals, result: PvpResult, xp: number) {
  totals.arenaXp += xp
  totals.pvpTicketsSubmittedCount += 1
  if (result === "win") totals.pvpMatchesWonCount += 1
  if (result === "loss") totals.pvpMatchesLostCount += 1
  if (result === "draw") totals.pvpMatchesDrawnCount += 1
}

function printLeaderboard(
  title: string,
  rows: Array<{ username: string; arenaXp: number }>,
) {
  console.log(`\n${title}`)
  console.table(
    rows
      .sort((a, b) => b.arenaXp - a.arenaXp)
      .slice(0, 20)
      .map((row, index) => ({
        rank: index + 1,
        username: row.username,
        arenaXp: row.arenaXp,
      })),
  )
}

async function rollback(snapshotPath: string) {
  const snapshot = JSON.parse(
    await readFile(path.resolve(snapshotPath), "utf8"),
  ) as Snapshot
  const db = mongoose.connection.db
  if (!db) throw new Error("MongoDB connection is unavailable.")
  if (db.databaseName !== snapshot.database) {
    throw new Error(
      `Snapshot database ${snapshot.database} does not match connected database ${db.databaseName}.`,
    )
  }

  const users = db.collection("users")
  const tickets = db.collection("pvptickets")
  const matches = db.collection("pvpmatches")

  await users.bulkWrite(
    snapshot.users.map((user) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(user.id) },
        update: {
          $set: {
            arenaXp: user.arenaXp,
            pvpTicketsSubmittedCount: user.pvpTicketsSubmittedCount,
            pvpMatchesWonCount: user.pvpMatchesWonCount,
            pvpMatchesLostCount: user.pvpMatchesLostCount,
            pvpMatchesDrawnCount: user.pvpMatchesDrawnCount,
            hasWonFirstPvpDuel: user.hasWonFirstPvpDuel,
          },
        },
      },
    })),
  )
  await tickets.bulkWrite(
    snapshot.tickets.map((ticket) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(ticket.id) },
        update: {
          $set: {
            score: ticket.score,
            xpEarned: ticket.xpEarned,
          },
        },
      },
    })),
  )
  await matches.bulkWrite(
    snapshot.matches.map((match) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(match.id) },
        update: {
          $set: {
            winnerId: match.winnerId
              ? new Types.ObjectId(match.winnerId)
              : null,
          },
        },
      },
    })),
  )

  console.log(`Rollback complete from ${path.resolve(snapshotPath)}`)
}

async function main() {
  await mongoose.connect(requiredMongoUri)
  const db = mongoose.connection.db
  if (!db) throw new Error("MongoDB connection is unavailable.")

  if (rollbackArg) {
    await rollback(rollbackArg.slice("--rollback=".length))
    return
  }

  const usersCollection = db.collection("users")
  const ticketsCollection = db.collection<TicketRecord>("pvptickets")
  const matchesCollection = db.collection<MatchRecord>("pvpmatches")

  const [users, tickets, matches] = await Promise.all([
    usersCollection
      .find(
        {},
        {
          projection: {
            username: 1,
            arenaXp: 1,
            pvpTicketsSubmittedCount: 1,
            pvpMatchesWonCount: 1,
            pvpMatchesLostCount: 1,
            pvpMatchesDrawnCount: 1,
            hasWonFirstPvpDuel: 1,
          },
        },
      )
      .toArray(),
    ticketsCollection.find({ status: "resolved" } as never).toArray(),
    matchesCollection.find({ status: "resolved" } as never).toArray(),
  ])

  const ticketById = new Map(
    tickets.map((ticket) => [ticket._id.toString(), ticket]),
  )
  const totalsByUser = new Map<string, UserTotals>()
  const ticketUpdates: Array<{
    id: Types.ObjectId
    score: number
    xpEarned: number
  }> = []
  const matchUpdates: Array<{
    id: Types.ObjectId
    winnerId: Types.ObjectId | null
  }> = []
  const skippedMatches: string[] = []

  for (const match of matches) {
    const ticket1 = ticketById.get(match.ticket1Id.toString())
    const ticket2 = ticketById.get(match.ticket2Id.toString())
    if (!ticket1 || !ticket2) {
      skippedMatches.push(
        `${match._id}: missing ${!ticket1 ? "ticket1" : "ticket2"}`,
      )
      continue
    }

    const score1 = calculatePvpScore(ticket1.picks)
    const score2 = calculatePvpScore(ticket2.picks)
    const winnerId =
      score1 > score2
        ? match.user1Id
        : score2 > score1
          ? match.user2Id
          : null
    const result1 = resultFor(winnerId, match.user1Id)
    const result2 = resultFor(winnerId, match.user2Id)
    const xp1 = calculatePvpResultXp(
      result1,
      score1,
      Boolean(ticket1.doubleBoostActive),
    )
    const xp2 = calculatePvpResultXp(
      result2,
      score2,
      Boolean(ticket2.doubleBoostActive),
    )

    const totals1 =
      totalsByUser.get(match.user1Id.toString()) ?? emptyTotals()
    const totals2 =
      totalsByUser.get(match.user2Id.toString()) ?? emptyTotals()
    addResult(totals1, result1, xp1)
    addResult(totals2, result2, xp2)
    totalsByUser.set(match.user1Id.toString(), totals1)
    totalsByUser.set(match.user2Id.toString(), totals2)

    ticketUpdates.push(
      { id: ticket1._id, score: score1, xpEarned: xp1 },
      { id: ticket2._id, score: score2, xpEarned: xp2 },
    )
    matchUpdates.push({ id: match._id, winnerId })
  }

  const currentLeaderboard = users.map((user) => ({
    username: String(user.username ?? user._id),
    arenaXp: Number(user.arenaXp ?? 0),
  }))
  const recalculatedLeaderboard = users.map((user) => ({
    username: String(user.username ?? user._id),
    arenaXp: totalsByUser.get(user._id.toString())?.arenaXp ?? 0,
  }))

  console.log(`Database: ${db.databaseName}`)
  console.log(`Resolved matches: ${matches.length}`)
  console.log(`Resolved tickets: ${tickets.length}`)
  console.log(`Skipped matches: ${skippedMatches.length}`)
  if (skippedMatches.length > 0) console.log(skippedMatches)
  printLeaderboard("Current Arena XP leaderboard", currentLeaderboard)
  printLeaderboard("Recalculated Arena XP leaderboard", recalculatedLeaderboard)

  if (!applyChanges) {
    console.log("\nDry run only. Re-run with --apply to update the database.")
    return
  }

  if (skippedMatches.length > 0) {
    throw new Error("Refusing to apply while resolved matches are incomplete.")
  }

  const snapshot: Snapshot = {
    createdAt: new Date().toISOString(),
    database: db.databaseName,
    users: users.map((user) => ({
      id: user._id.toString(),
      arenaXp: Number(user.arenaXp ?? 0),
      pvpTicketsSubmittedCount: Number(user.pvpTicketsSubmittedCount ?? 0),
      pvpMatchesWonCount: Number(user.pvpMatchesWonCount ?? 0),
      pvpMatchesLostCount: Number(user.pvpMatchesLostCount ?? 0),
      pvpMatchesDrawnCount: Number(user.pvpMatchesDrawnCount ?? 0),
      hasWonFirstPvpDuel: Boolean(user.hasWonFirstPvpDuel),
    })),
    tickets: tickets.map((ticket) => ({
      id: ticket._id.toString(),
      score: Number(ticket.score ?? 0),
      xpEarned: Number(ticket.xpEarned ?? 0),
    })),
    matches: matches.map((match) => ({
      id: match._id.toString(),
      winnerId: match.winnerId?.toString() ?? null,
    })),
  }
  const backupDirectory = path.join(
    path.parse(process.cwd()).root,
    "tmp",
    "verity-backups",
  )
  await mkdir(backupDirectory, { recursive: true })
  const snapshotPath = path.join(
    backupDirectory,
    `pvp-xp-before-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  )
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2))

  await usersCollection.bulkWrite(
    users.map((user) => {
      const totals = totalsByUser.get(user._id.toString()) ?? emptyTotals()
      return {
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              ...totals,
              hasWonFirstPvpDuel: totals.pvpMatchesWonCount > 0,
            },
          },
        },
      }
    }),
  )
  await ticketsCollection.bulkWrite(
    ticketUpdates.map((ticket) => ({
      updateOne: {
        filter: { _id: ticket.id },
        update: {
          $set: {
            score: ticket.score,
            xpEarned: ticket.xpEarned,
          },
        },
      },
    })),
  )
  await matchesCollection.bulkWrite(
    matchUpdates.map((match) => ({
      updateOne: {
        filter: { _id: match.id },
        update: {
          $set: { winnerId: match.winnerId },
        },
      },
    })),
  )

  console.log(`\nApplied recalculation. Rollback snapshot: ${snapshotPath}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
