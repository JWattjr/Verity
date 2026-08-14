import { Injectable, InternalServerErrorException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import type { ClobCredentialPayload } from "./polymarket-account.types"

@Injectable()
export class PolymarketCredentialCipher {
  private static readonly algorithm = "aes-256-gcm"

  constructor(private readonly configService: ConfigService) {}

  encrypt(credentials: ClobCredentialPayload): string {
    const key = this.key()
    const iv = randomBytes(12)
    const cipher = createCipheriv(PolymarketCredentialCipher.algorithm, key, iv)
    const plaintext = Buffer.from(JSON.stringify(credentials), "utf8")
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const tag = cipher.getAuthTag()
    return [
      "v1",
      iv.toString("base64"),
      tag.toString("base64"),
      ciphertext.toString("base64"),
    ].join(":")
  }

  decrypt(envelope: string): ClobCredentialPayload {
    const [version, iv, tag, ciphertext] = envelope.split(":")
    if (version !== "v1" || !iv || !tag || !ciphertext) {
      throw new InternalServerErrorException(
        "Invalid encrypted CLOB credential envelope.",
      )
    }

    try {
      const decipher = createDecipheriv(
        PolymarketCredentialCipher.algorithm,
        this.key(),
        Buffer.from(iv, "base64"),
      )
      decipher.setAuthTag(Buffer.from(tag, "base64"))
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64")),
        decipher.final(),
      ])
      const parsed = JSON.parse(
        plaintext.toString("utf8"),
      ) as ClobCredentialPayload
      if (!parsed.key || !parsed.secret || !parsed.passphrase)
        throw new Error("Incomplete credentials")
      return parsed
    } catch {
      throw new InternalServerErrorException(
        "Unable to decrypt CLOB credentials.",
      )
    }
  }

  private key(): Buffer {
    const configured = this.configService
      .get<string>("POLYMARKET_CREDENTIAL_ENCRYPTION_KEY")
      ?.trim()
    if (!configured) {
      throw new InternalServerErrorException(
        "POLYMARKET_CREDENTIAL_ENCRYPTION_KEY is not configured.",
      )
    }

    const key = /^[0-9a-fA-F]{64}$/.test(configured)
      ? Buffer.from(configured, "hex")
      : Buffer.from(configured, "base64")
    if (key.length !== 32) {
      throw new InternalServerErrorException(
        "POLYMARKET_CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes.",
      )
    }
    return key
  }
}
