import "dotenv/config"
import mongoose from "mongoose"
import {
  PrelaunchReferral,
  PrelaunchReferralSchema,
  PrelaunchShareClick,
  PrelaunchShareClickSchema,
  PrelaunchUser,
  PrelaunchUserSchema,
} from "../modules/prelaunch/prelaunch.model"

const SEEDED_USERS = [
  { telegramId: "900000001", username: "local_player", club: "Arsenal" },
  { telegramId: "900000002", username: "northbank", club: "Arsenal" },
  { telegramId: "900000003", username: "skyblue", club: "Coventry City" },
  { telegramId: "900000004", username: "tractorboy", club: "Ipswich Town" },
  { telegramId: "900000005", username: "tigerroar", club: "Hull City" },
  { telegramId: "900000006", username: "blackcat", club: "Sunderland" },
]

async function seed() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/verity"
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 })

  const UserModel = mongoose.model(PrelaunchUser.name, PrelaunchUserSchema)
  const ReferralModel = mongoose.model(
    PrelaunchReferral.name,
    PrelaunchReferralSchema,
  )
  const ShareClickModel = mongoose.model(
    PrelaunchShareClick.name,
    PrelaunchShareClickSchema,
  )

  for (const [index, user] of SEEDED_USERS.entries()) {
    await UserModel.updateOne(
      { telegramId: user.telegramId },
      {
        $set: {
          username: user.username,
          club: user.club,
          referredBy: index === 0 ? null : SEEDED_USERS[0].telegramId,
          postLaunchDuels: index > 0 && index < 3 ? 2 : 0,
        },
        $setOnInsert: { joinedAt: new Date(Date.now() - index * 3_600_000) },
      },
      { upsert: true },
    )
  }

  for (let index = 1; index < SEEDED_USERS.length; index += 1) {
    const activated = index < 3
    await ReferralModel.updateOne(
      { referredId: SEEDED_USERS[index].telegramId },
      {
        $set: {
          referrerId: SEEDED_USERS[0].telegramId,
          status: activated ? "activated" : "pending",
          activatedAt: activated ? new Date() : null,
          ticketSlot: activated ? index : null,
        },
        $setOnInsert: { createdAt: new Date(Date.now() - index * 2_400_000) },
      },
      { upsert: true },
    )
  }

  const existingShareClicks = await ShareClickModel.countDocuments({
    telegramId: SEEDED_USERS[0].telegramId,
  })
  if (existingShareClicks === 0) {
    await ShareClickModel.insertMany([
      { telegramId: SEEDED_USERS[0].telegramId, method: "copy" },
      { telegramId: SEEDED_USERS[0].telegramId, method: "share" },
      { telegramId: SEEDED_USERS[0].telegramId, method: "share" },
    ])
  }

  console.log(
    `Seeded ${SEEDED_USERS.length} Telegram pre-launch users. Local identity: 900000001 (@local_player).`,
  )
  await mongoose.disconnect()
}

seed().catch(async (error) => {
  console.error(error)
  await mongoose.disconnect()
  process.exitCode = 1
})
