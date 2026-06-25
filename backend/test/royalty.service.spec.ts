import { Test, TestingModule } from "@nestjs/testing"
import { getModelToken } from "@nestjs/mongoose"
import { RoyaltyService } from "../src/modules/markets/royalty.service"
import { MarketTrade } from "../src/modules/markets/markets.model"
import { BlockchainService } from "../src/modules/blockchain/blockchain.service"
import { Types } from "mongoose"

describe("RoyaltyService", () => {
  let service: RoyaltyService
  let blockchainService: jest.Mocked<BlockchainService>
  let marketTradeModel: any

  const mockTrade = (overrides = {}) => {
    const save = jest.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this)
    })
    return {
      _id: new Types.ObjectId(),
      marketId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      side: "YES",
      action: "BUY" as const,
      shares: 10,
      price: 0.5,
      amountUsdc: 5.0,
      feeUsdc: 0.10,
      grossUsdc: 5.10,
      txHash: "0xOriginalTx",
      royaltyPaid: false,
      royaltyPaidTxHash: null,
      royaltyAmountUsdc: 0,
      createdAt: new Date(),
      save,
      ...overrides,
    } as any
  }

  beforeEach(async () => {
    const mockBlockchainService = {
      getPoolState: jest.fn(),
      getAdminAddress: jest.fn().mockReturnValue("0xAdminAddress"),
      transferUsdcFromTreasury: jest.fn(),
    }

    const mockMarketTradeModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoyaltyService,
        {
          provide: getModelToken(MarketTrade.name),
          useValue: mockMarketTradeModel,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
      ],
    }).compile()

    service = module.get<RoyaltyService>(RoyaltyService)
    blockchainService = module.get(BlockchainService)
    marketTradeModel = module.get(getModelToken(MarketTrade.name))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("processTradeRoyalty", () => {
    it("should return early if feeUsdc is 0 or less", async () => {
      const trade = mockTrade({ feeUsdc: 0 })
      await service.processTradeRoyalty(trade)
      expect(blockchainService.getPoolState).not.toHaveBeenCalled()
      expect(trade.save).not.toHaveBeenCalled()
    })

    it("should return early if royaltyPaid is already true", async () => {
      const trade = mockTrade({ royaltyPaid: true })
      await service.processTradeRoyalty(trade)
      expect(blockchainService.getPoolState).not.toHaveBeenCalled()
      expect(trade.save).not.toHaveBeenCalled()
    })

    it("should mark royalty as paid and amount as 0 if rounded royaltyAmount is 0", async () => {
      // 0.000001 USDC * 0.20 = 0.0000002 -> round to 6 decimals is 0
      const trade = mockTrade({ feeUsdc: 0.000001 })
      await service.processTradeRoyalty(trade)
      expect(blockchainService.getPoolState).not.toHaveBeenCalled()
      expect(trade.royaltyPaid).toBe(true)
      expect(trade.royaltyAmountUsdc).toBe(0)
      expect(trade.save).toHaveBeenCalled()
    })

    it("should warn and skip if creatorAddress is missing or zero address", async () => {
      const trade = mockTrade({ feeUsdc: 1.0 })
      blockchainService.getPoolState.mockResolvedValue({
        creatorAddress: "0x0000000000000000000000000000000000000000",
        creatorShares: 100n,
        totalLpShares: 1000n,
        active: true,
        resolved: false,
        adminLpShares: 0n,
      })

      await service.processTradeRoyalty(trade)
      expect(blockchainService.getPoolState).toHaveBeenCalledWith(trade.marketId.toString())
      expect(blockchainService.transferUsdcFromTreasury).not.toHaveBeenCalled()
      expect(trade.save).not.toHaveBeenCalled()
    })

    it("should skip transfer and set txHash to self_split if creator is admin/treasury", async () => {
      const trade = mockTrade({ feeUsdc: 1.0 })
      blockchainService.getPoolState.mockResolvedValue({
        creatorAddress: "0xAdminAddress",
        creatorShares: 100n,
        totalLpShares: 1000n,
        active: true,
        resolved: false,
        adminLpShares: 0n,
      })

      await service.processTradeRoyalty(trade)
      expect(blockchainService.getPoolState).toHaveBeenCalledWith(trade.marketId.toString())
      expect(blockchainService.transferUsdcFromTreasury).not.toHaveBeenCalled()
      expect(trade.royaltyPaid).toBe(true)
      expect(trade.royaltyPaidTxHash).toBe("self_split")
      expect(trade.royaltyAmountUsdc).toBe(0.20) // 1.0 * 0.40 * 0.50
      expect(trade.save).toHaveBeenCalled()
    })

    it("should transfer USDC from treasury and update trade if creator is a third party", async () => {
      const trade = mockTrade({ feeUsdc: 10.0 })
      blockchainService.getPoolState.mockResolvedValue({
        creatorAddress: "0xCreatorAddress",
        creatorShares: 100n,
        totalLpShares: 1000n,
        active: true,
        resolved: false,
        adminLpShares: 0n,
      })
      blockchainService.transferUsdcFromTreasury.mockResolvedValue("0xTxHash123")

      await service.processTradeRoyalty(trade)
      expect(blockchainService.getPoolState).toHaveBeenCalledWith(trade.marketId.toString())
      expect(blockchainService.transferUsdcFromTreasury).toHaveBeenCalledWith(
        "0xCreatorAddress",
        2.0, // 10.0 * 0.40 * 0.50 = 2.0
      )
      expect(trade.royaltyPaid).toBe(true)
      expect(trade.royaltyPaidTxHash).toBe("0xTxHash123")
      expect(trade.royaltyAmountUsdc).toBe(2.0)
      expect(trade.save).toHaveBeenCalled()
    })

    it("should catch transfer errors and not throw/crash", async () => {
      const trade = mockTrade({ feeUsdc: 5.0 })
      blockchainService.getPoolState.mockResolvedValue({
        creatorAddress: "0xCreatorAddress",
        creatorShares: 100n,
        totalLpShares: 1000n,
        active: true,
        resolved: false,
        adminLpShares: 0n,
      })
      blockchainService.transferUsdcFromTreasury.mockRejectedValue(new Error("RPC Timeout"))

      await expect(service.processTradeRoyalty(trade)).resolves.not.toThrow()
      expect(trade.royaltyPaid).toBe(false)
      expect(trade.save).not.toHaveBeenCalled()
    })
  })
})
