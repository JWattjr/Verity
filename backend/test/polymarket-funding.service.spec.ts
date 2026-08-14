import { ConflictException } from "@nestjs/common"
import { Types } from "mongoose"
import { PolymarketAccountRepository } from "../src/modules/polymarket/polymarket-account.repository"
import {
  PolymarketAccountRecord,
  PolymarketBridgeAddresses,
  PolymarketProvisioningStatus,
} from "../src/modules/polymarket/polymarket-account.types"
import { PolymarketFundingGateway } from "../src/modules/polymarket/polymarket-funding.gateway"
import { PolymarketFundingService } from "../src/modules/polymarket/polymarket-funding.service"

const userId = new Types.ObjectId().toString()
const depositWallet = "0x2222222222222222222222222222222222222222"
const bridgeAddresses: PolymarketBridgeAddresses = {
  evm: "0x3333333333333333333333333333333333333333",
  svm: "svm-deposit-address",
  btc: "btc-deposit-address",
  tron: "tron-deposit-address",
}

function account(
  overrides: Partial<PolymarketAccountRecord> = {},
): PolymarketAccountRecord {
  return {
    userId: new Types.ObjectId(userId),
    chainId: 137,
    circleBlockchain: "MATIC",
    status: PolymarketProvisioningStatus.Ready,
    circleWalletIdempotencyKey: "51ef67f3-9a4f-4ef9-a986-61dfadbd5ba3",
    clobCredentialNonce: 0,
    depositWalletAddress: depositWallet,
    approvals: [],
    pusdBalanceBaseUnits: "0",
    fundingTransactions: [],
    provisioningAttempts: 1,
    ...overrides,
  }
}

class MemoryRepository {
  current = account()

  ensure() {
    return Promise.resolve(this.current)
  }

  updateFunding(_userId: string, values: Partial<PolymarketAccountRecord>) {
    this.current = { ...this.current, ...values }
    return Promise.resolve(this.current)
  }
}

function gateway() {
  return {
    createDepositAddresses: jest.fn().mockResolvedValue(bridgeAddresses),
    getPusdBalance: jest.fn().mockResolvedValue("2123456"),
    getTransactions: jest.fn().mockResolvedValue([
      {
        fromChainId: "1",
        fromTokenAddress: "0xusdc",
        fromAmountBaseUnit: "2000000",
        toChainId: "137",
        toTokenAddress: "0xpusd",
        status: "COMPLETED",
        txHash: "0xtransaction",
        createdTimeMs: 1234,
      },
    ]),
  }
}

describe("PolymarketFundingService", () => {
  let repository: MemoryRepository
  let upstream: ReturnType<typeof gateway>
  let service: PolymarketFundingService

  beforeEach(() => {
    repository = new MemoryRepository()
    upstream = gateway()
    service = new PolymarketFundingService(
      repository as unknown as PolymarketAccountRepository,
      upstream as unknown as PolymarketFundingGateway,
    )
  })

  it("creates and persists bridge deposit addresses", async () => {
    const result = await service.getOrCreateDepositAddresses(userId)

    expect(result.bridgeAddresses).toEqual(bridgeAddresses)
    expect(upstream.createDepositAddresses).toHaveBeenCalledWith(depositWallet)
    expect(repository.current.bridgeAddresses).toEqual(bridgeAddresses)
  })

  it("reuses persisted bridge addresses without another upstream request", async () => {
    repository.current.bridgeAddresses = bridgeAddresses

    await service.getOrCreateDepositAddresses(userId)
    await service.getOrCreateDepositAddresses(userId)

    expect(upstream.createDepositAddresses).not.toHaveBeenCalled()
  })

  it("reconciles pUSD balance and bridge transaction state", async () => {
    repository.current.bridgeAddresses = bridgeAddresses

    const result = await service.reconcile(userId)

    expect(result.pusdBalanceBaseUnits).toBe("2123456")
    expect(result.pusdBalance).toBe("2.123456")
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].status).toBe("COMPLETED")
    expect(result.reconciledAt).toBeInstanceOf(Date)
    expect(upstream.getPusdBalance).toHaveBeenCalledWith(depositWallet)
    expect(upstream.getTransactions).toHaveBeenCalledWith(bridgeAddresses)
  })

  it("can reconcile the wallet balance before addresses are created", async () => {
    const result = await service.reconcile(userId)

    expect(result.pusdBalance).toBe("2.123456")
    expect(result.transactions).toEqual([])
    expect(upstream.getTransactions).not.toHaveBeenCalled()
  })

  it("rejects funding until account provisioning is ready", async () => {
    repository.current.status = PolymarketProvisioningStatus.ApprovalsPending

    await expect(
      service.getOrCreateDepositAddresses(userId),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(upstream.createDepositAddresses).not.toHaveBeenCalled()
  })
})
