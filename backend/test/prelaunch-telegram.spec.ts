import { createHmac } from "crypto"
import { verifyTelegramInitData } from "../src/modules/prelaunch/telegram-init-data"

describe("Telegram Mini App initData verification", () => {
  const botToken = "123456:test-token"
  const authDate = 1_786_000_000

  function sign(entries: Record<string, string>) {
    const params = new URLSearchParams(entries)
    const dataCheckString = [...params.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")
    const secret = createHmac("sha256", "WebAppData").update(botToken).digest()
    params.set(
      "hash",
      createHmac("sha256", secret).update(dataCheckString).digest("hex"),
    )
    return params.toString()
  }

  it("accepts a correctly signed Telegram user", () => {
    const initData = sign({
      auth_date: String(authDate),
      query_id: "test-query",
      user: JSON.stringify({ id: 99112233, username: "verity_test" }),
    })

    expect(
      verifyTelegramInitData(initData, botToken, 3600, authDate + 10),
    ).toEqual({
      id: "99112233",
      username: "verity_test",
      firstName: null,
      lastName: null,
    })
  })

  it("rejects tampered Telegram data", () => {
    const initData = sign({
      auth_date: String(authDate),
      user: JSON.stringify({ id: 99112233, username: "verity_test" }),
    }).replace("verity_test", "attacker")

    expect(() =>
      verifyTelegramInitData(initData, botToken, 3600, authDate + 10),
    ).toThrow("Telegram authentication is invalid")
  })
})
