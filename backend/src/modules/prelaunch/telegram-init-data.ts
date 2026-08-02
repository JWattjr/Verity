import { createHmac, timingSafeEqual } from "crypto"
import { UnauthorizedException } from "@nestjs/common"

export type VerifiedTelegramUser = {
  id: string
  username: string | null
  firstName: string | null
  lastName: string | null
}

type TelegramUserPayload = {
  id?: number | string
  username?: string
  first_name?: string
  last_name?: string
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000),
): VerifiedTelegramUser {
  if (!initData || !botToken) {
    throw new UnauthorizedException("Telegram authentication is required.")
  }

  const params = new URLSearchParams(initData)
  const receivedHash = params.get("hash")
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
    throw new UnauthorizedException("Telegram authentication is invalid.")
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest()
  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest()
  const receivedHashBuffer = Buffer.from(receivedHash, "hex")

  if (
    receivedHashBuffer.length !== calculatedHash.length ||
    !timingSafeEqual(receivedHashBuffer, calculatedHash)
  ) {
    throw new UnauthorizedException("Telegram authentication is invalid.")
  }

  const authDate = Number(params.get("auth_date"))
  if (
    !Number.isFinite(authDate) ||
    authDate > nowSeconds + 30 ||
    nowSeconds - authDate > maxAgeSeconds
  ) {
    throw new UnauthorizedException("Telegram authentication has expired.")
  }

  const rawUser = params.get("user")
  if (!rawUser) {
    throw new UnauthorizedException("Telegram user identity is missing.")
  }

  let payload: TelegramUserPayload
  try {
    payload = JSON.parse(rawUser) as TelegramUserPayload
  } catch {
    throw new UnauthorizedException("Telegram user identity is invalid.")
  }

  const id = String(payload.id ?? "")
  if (!/^\d+$/.test(id)) {
    throw new UnauthorizedException("Telegram user identity is invalid.")
  }

  return {
    id,
    username: payload.username?.trim() || null,
    firstName: payload.first_name?.trim() || null,
    lastName: payload.last_name?.trim() || null,
  }
}
