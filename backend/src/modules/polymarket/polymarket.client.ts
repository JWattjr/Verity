import { BadGatewayException, Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

@Injectable()
export class PolymarketClient {
  private readonly gammaBaseUrl: string
  private readonly requestTimeoutMs: number

  constructor(private readonly configService: ConfigService) {
    this.gammaBaseUrl = this.configService
      .get<string>(
        "POLYMARKET_GAMMA_API_URL",
        "https://gamma-api.polymarket.com",
      )
      .replace(/\/$/, "")
    this.requestTimeoutMs = this.positiveInteger(
      this.configService.get<string>("POLYMARKET_REQUEST_TIMEOUT_MS"),
      10000,
    )
  }

  async get<T>(path: string, query?: URLSearchParams): Promise<T> {
    const url = new URL(`${this.gammaBaseUrl}${path}`)
    if (query) {
      query.forEach((value, key) => url.searchParams.append(key, value))
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs)

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new BadGatewayException(
          `Polymarket Gamma API returned HTTP ${response.status}.`,
        )
      }

      return (await response.json()) as T
    } catch (error) {
      if (error instanceof BadGatewayException) throw error

      const reason =
        error instanceof Error && error.name === "AbortError"
          ? "request timed out"
          : "request failed"
      throw new BadGatewayException(`Polymarket Gamma API ${reason}.`)
    } finally {
      clearTimeout(timeout)
    }
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
  }
}
