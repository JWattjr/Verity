import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { MarketsKeeperService } from "../src/modules/markets/marketskeeper.service";
import { BlockchainService } from "../src/modules/blockchain/blockchain.service";
import { Market } from "../src/modules/markets/markets.model";

describe("MarketsKeeperService", () => {
  let service: MarketsKeeperService;
  let blockchainService: jest.Mocked<BlockchainService>;
  let marketModel: any;

  const mockMarket = {
    _id: "60d0fe4f5311236168a109ca",
    question: "Will BTC reach $100k?",
    priceFeedId: "0xe62665949c883f9e0f6f002eac32e00bd59dfe6c34e92a91c37d6a8322d6489",
    deadline: new Date(Date.now() - 10000), // in the past
    status: "tradable",
    isPythMarket: true,
    resolvedOutcome: null as string | null,
    resolvedByAdmin: null as string | null,
    save: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    const mockBlockchainService = {
      resolveMarketWithPyth: jest.fn().mockResolvedValue("0xTxHash"),
      getTransactionReceipt: jest.fn().mockResolvedValue({ blockNumber: 12345 }),
      readOnChainMarketState: jest.fn().mockResolvedValue({ resolved: true, winningIsYes: true, totalCollateral: BigInt(100) }),
    };

    const mockMarketModel = {
      find: jest.fn().mockResolvedValue([mockMarket]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketsKeeperService,
        {
          provide: getModelToken(Market.name),
          useValue: mockMarketModel,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
      ],
    }).compile();

    service = module.get<MarketsKeeperService>(MarketsKeeperService);
    blockchainService = module.get(BlockchainService);
    marketModel = module.get(getModelToken(Market.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should query expired markets and resolve them", async () => {
    // Mock global fetch
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        binary: {
          data: ["0x1234"],
        },
      }),
    });
    global.fetch = mockFetch as any;

    await service.processExpiredMarkets();

    expect(marketModel.find).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://benchmarks.pyth.network/v1/updates/price/")
    );
    expect(blockchainService.resolveMarketWithPyth).toHaveBeenCalledWith(
      mockMarket._id,
      ["0x1234"]
    );
    expect(blockchainService.getTransactionReceipt).toHaveBeenCalledWith("0xTxHash");
    expect(blockchainService.readOnChainMarketState).toHaveBeenCalledWith(mockMarket._id);
    expect(mockMarket.status).toBe("resolved");
    expect(mockMarket.resolvedOutcome).toBe("YES");
    expect(mockMarket.resolvedByAdmin).toBe("0xKeeper");
    expect(mockMarket.save).toHaveBeenCalled();
  });
});
