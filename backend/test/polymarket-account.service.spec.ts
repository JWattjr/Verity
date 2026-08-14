import { ConfigService } from "@nestjs/config"
import { Types } from "mongoose"
import { PolymarketAccountRepository } from "../src/modules/polymarket/polymarket-account.repository"
import { PolymarketAccountService } from "../src/modules/polymarket/polymarket-account.service"
import {
  PolymarketAccountRecord,
  PolymarketProvisioningStatus,
} from "../src/modules/polymarket/polymarket-account.types"
import { PolymarketCredentialCipher } from "../src/modules/polymarket/polymarket-credential-cipher.service"
import { PolymarketProvisioningGateway } from "../src/modules/polymarket/polymarket-provisioning.gateway"

const userId = new Types.ObjectId().toString()
const owner = "0x1111111111111111111111111111111111111111" as const
const deposit = "0x2222222222222222222222222222222222222222" as const

function account(
  overrides: Partial<PolymarketAccountRecord> = {},
): PolymarketAccountRecord {
  return {
    userId: new Types.ObjectId(userId),
    chainId: 137,
    circleBlockchain: "MATIC",
    status: PolymarketProvisioningStatus.Uninitialized,
    circleWalletIdempotencyKey: "51ef67f3-9a4f-4ef9-a986-61dfadbd5ba3",
    clobCredentialNonce: 0,
    approvals: [],
    provisioningAttempts: 0,
    ...overrides,
  }
}

class MemoryRepository {
  current = account()
  leaseBlocked = false

  ensure() {
    return Promise.resolve(this.current)
  }

  findByUserId() {
    return Promise.resolve(this.current)
  }

  acquireLease(_userId: string, leaseId: string, leaseUntil: Date) {
    if (this.leaseBlocked) return Promise.resolve(null)
    this.current = {
      ...this.current,
      provisioningLeaseId: leaseId,
      provisioningLeaseUntil: leaseUntil,
      provisioningAttempts: this.current.provisioningAttempts + 1,
    }
    return Promise.resolve(this.current)
  }

  patch(
    _userId: string,
    _leaseId: string,
    values: Partial<PolymarketAccountRecord>,
  ) {
    this.current = { ...this.current, ...values }
    return Promise.resolve(this.current)
  }

  releaseLease() {
    this.current.provisioningLeaseId = null
    this.current.provisioningLeaseUntil = null
    return Promise.resolve()
  }
}

function gateway() {
  return {
    createCircleWallet: jest
      .fn()
      .mockResolvedValue({ id: "circle-wallet", address: owner }),
    createClobCredentials: jest.fn().mockResolvedValue({
      key: "clob-key",
      secret: "clob-secret",
      passphrase: "clob-passphrase",
    }),
    deriveDepositWallet: jest.fn().mockResolvedValue(deposit),
    ensureDepositWallet: jest
      .fn()
      .mockResolvedValue({ transactionHash: "0xdeploy" }),
    ensureTradingApprovals: jest.fn().mockResolvedValue({
      transactionHash: "0xapprove",
      approvals: [
        {
          spender: "0x3333333333333333333333333333333333333333",
          collateralApproved: true,
          conditionalTokensApproved: true,
          checkedAt: new Date(),
        },
      ],
    }),
  }
}

describe("PolymarketAccountService", () => {
  let repository: MemoryRepository
  let upstream: ReturnType<typeof gateway>
  let service: PolymarketAccountService

  beforeEach(() => {
    repository = new MemoryRepository()
    upstream = gateway()
    service = new PolymarketAccountService(
      repository as unknown as PolymarketAccountRepository,
      upstream as unknown as PolymarketProvisioningGateway,
      {
        encrypt: jest.fn(() => "encrypted-clob-credentials"),
      } as unknown as PolymarketCredentialCipher,
    )
  })

  it("provisions once and returns only safe account state", async () => {
    const result = await service.provision(userId)

    expect(result.status).toBe(PolymarketProvisioningStatus.Ready)
    expect(result.circleWalletAddress).toBe(owner)
    expect(result.depositWalletAddress).toBe(deposit)
    expect(result.provisioning).toBe(false)
    expect(result).not.toHaveProperty("circleWalletId")
    expect(result).not.toHaveProperty("clobCredentialsEncrypted")
    expect(upstream.createCircleWallet).toHaveBeenCalledTimes(1)
    expect(upstream.createClobCredentials).toHaveBeenCalledTimes(1)
    expect(upstream.ensureTradingApprovals).toHaveBeenCalledTimes(1)

    await service.provision(userId)
    expect(upstream.createCircleWallet).toHaveBeenCalledTimes(1)
    expect(upstream.createClobCredentials).toHaveBeenCalledTimes(1)
    expect(upstream.ensureTradingApprovals).toHaveBeenCalledTimes(1)
  })

  it("resumes from persisted wallet, credentials, and deposit address", async () => {
    repository.current = account({
      status: PolymarketProvisioningStatus.FailedRetryable,
      circleWalletId: "existing-circle-wallet",
      circleWalletAddress: owner,
      clobCredentialsEncrypted: "existing-encrypted-credentials",
      depositWalletAddress: deposit,
    })

    const result = await service.provision(userId)

    expect(result.status).toBe(PolymarketProvisioningStatus.Ready)
    expect(upstream.createCircleWallet).not.toHaveBeenCalled()
    expect(upstream.createClobCredentials).not.toHaveBeenCalled()
    expect(upstream.deriveDepositWallet).not.toHaveBeenCalled()
    expect(upstream.ensureDepositWallet).toHaveBeenCalledTimes(1)
    expect(upstream.ensureTradingApprovals).toHaveBeenCalledTimes(1)
  })

  it("does not start duplicate work while another request holds the lease", async () => {
    repository.leaseBlocked = true
    repository.current.provisioningLeaseUntil = new Date(Date.now() + 60_000)

    const result = await service.provision(userId)

    expect(result.provisioning).toBe(true)
    expect(upstream.createCircleWallet).not.toHaveBeenCalled()
  })

  it("persists a retryable failure without leaking the upstream message", async () => {
    upstream.createCircleWallet.mockRejectedValue(
      new Error("provider rejected entity secret super-sensitive-value"),
    )

    const result = await service.provision(userId)

    expect(result.status).toBe(PolymarketProvisioningStatus.FailedRetryable)
    expect(result.lastError?.code).toBe("POLYMARKET_PROVISIONING_FAILED")
    expect(result.lastError?.message).not.toContain("super-sensitive-value")
    expect(repository.current.provisioningLeaseId).toBeNull()
  })
})

describe("PolymarketCredentialCipher", () => {
  it("round-trips CLOB credentials through an authenticated envelope", () => {
    const key = Buffer.alloc(32, 7).toString("base64")
    const cipher = new PolymarketCredentialCipher({
      get: jest.fn(() => key),
    } as unknown as ConfigService)
    const credentials = {
      key: "api-key",
      secret: "api-secret",
      passphrase: "passphrase",
    }

    const encrypted = cipher.encrypt(credentials)

    expect(encrypted).not.toContain(credentials.secret)
    expect(cipher.decrypt(encrypted)).toEqual(credentials)
  })
})
