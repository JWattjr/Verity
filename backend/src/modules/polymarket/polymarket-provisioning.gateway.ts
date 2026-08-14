import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import {
  CircleDeveloperControlledWalletsClient,
  initiateDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets"
import {
  DepositWalletCall,
  RelayClient,
} from "@polymarket/builder-relayer-client"
import {
  BuilderApiKeyCreds,
  BuilderConfig,
} from "@polymarket/builder-signing-sdk"
import { Chain, ClobClient } from "@polymarket/clob-client-v2"
import { webcrypto } from "node:crypto"
import {
  Address,
  Hex,
  TypedData,
  TypedDataDomain,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  hashTypedData,
  http,
  maxUint256,
  recoverAddress,
} from "viem"
import { toAccount } from "viem/accounts"
import { polygon } from "viem/chains"
import {
  CirclePolygonWallet,
  ClobCredentialPayload,
  DepositWalletDeploymentResult,
  PolymarketApprovalState,
  TradingApprovalResult,
} from "./polymarket-account.types"

const CHAIN_ID = 137
const RELAYER_URL = "https://relayer-v2.polymarket.com"
const CLOB_URL = "https://clob.polymarket.com"
const PUSD = "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB" as Address
const CONDITIONAL_TOKENS =
  "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045" as Address
const EXCHANGES = [
  "0xE111180000d2663C0091e4f400237545B87B996B",
  "0xe2222d279d744050d28e00520010520000310F59",
  "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
] as const satisfies readonly Address[]

const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const

const erc1155Abi = [
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
] as const

const ownerAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const

@Injectable()
export class PolymarketProvisioningGateway {
  private circleClient?: CircleDeveloperControlledWalletsClient

  constructor(private readonly configService: ConfigService) {}

  async createCircleWallet(
    userId: string,
    idempotencyKey: string,
  ): Promise<CirclePolygonWallet> {
    this.assertPolygonConfiguration()
    const response = await this.circle().createWallets({
      walletSetId: this.required("CIRCLE_WALLET_SET_ID"),
      blockchains: ["MATIC"],
      accountType: "EOA",
      count: 1,
      idempotencyKey,
      metadata: [{ name: "Verity Polymarket account", refId: userId }],
    })
    const wallet = response.data?.wallets?.[0]
    if (!wallet?.id || !wallet.address) {
      throw new ServiceUnavailableException(
        "Circle did not return a Polygon EOA wallet.",
      )
    }
    if (wallet.blockchain !== "MATIC") {
      throw new ServiceUnavailableException(
        `Circle returned ${wallet.blockchain}, expected MATIC.`,
      )
    }
    return { id: wallet.id, address: wallet.address.toLowerCase() as Address }
  }

  async createClobCredentials(
    wallet: CirclePolygonWallet,
    nonce: number,
  ): Promise<ClobCredentialPayload> {
    this.ensureWebCrypto()
    const client = new ClobClient({
      host: CLOB_URL,
      chain: Chain.POLYGON,
      signer: this.walletClient(wallet),
      useServerTime: true,
      throwOnError: true,
    })

    let credentials: ClobCredentialPayload
    try {
      credentials = await client.deriveApiKey(nonce)
    } catch {
      try {
        credentials = await client.createApiKey(nonce)
      } catch {
        credentials = await client.deriveApiKey(nonce)
      }
    }
    if (!credentials.key || !credentials.secret || !credentials.passphrase) {
      throw new ServiceUnavailableException(
        "Polymarket returned incomplete CLOB credentials.",
      )
    }
    return credentials
  }

  async deriveDepositWallet(wallet: CirclePolygonWallet): Promise<Address> {
    return (await this.relayer(wallet).deriveDepositWalletAddress()) as Address
  }

  async ensureDepositWallet(
    wallet: CirclePolygonWallet,
    depositWallet: Address,
  ): Promise<DepositWalletDeploymentResult> {
    const relayer = this.relayer(wallet)
    let transactionHash: string | null = null
    let deployed = await relayer.getDeployed(depositWallet, "WALLET")
    if (!deployed) {
      const response = await relayer.deployDepositWallet()
      const confirmed = await response.wait()
      if (!confirmed)
        throw new ServiceUnavailableException(
          "Deposit Wallet deployment was not confirmed.",
        )
      transactionHash = confirmed.transactionHash || null
      deployed = await relayer.getDeployed(depositWallet, "WALLET")
    }
    if (!deployed)
      throw new ServiceUnavailableException("Deposit Wallet is not deployed.")

    const publicClient = this.publicClient()
    const [bytecode, owner] = await Promise.all([
      publicClient.getCode({ address: depositWallet }),
      publicClient.readContract({
        address: depositWallet,
        abi: ownerAbi,
        functionName: "owner",
      }),
    ])
    if (!bytecode || bytecode === "0x") {
      throw new ServiceUnavailableException(
        "Deposit Wallet has no Polygon bytecode.",
      )
    }
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new ServiceUnavailableException(
        "Deposit Wallet owner does not match the Circle EOA.",
      )
    }
    return { transactionHash }
  }

  async ensureTradingApprovals(
    wallet: CirclePolygonWallet,
    depositWallet: Address,
  ): Promise<TradingApprovalResult> {
    const publicClient = this.publicClient()
    const calls: DepositWalletCall[] = []
    for (const exchange of EXCHANGES) {
      const [allowance, approved] = await Promise.all([
        publicClient.readContract({
          address: PUSD,
          abi: erc20Abi,
          functionName: "allowance",
          args: [depositWallet, exchange],
        }),
        publicClient.readContract({
          address: CONDITIONAL_TOKENS,
          abi: erc1155Abi,
          functionName: "isApprovedForAll",
          args: [depositWallet, exchange],
        }),
      ])
      if (allowance !== maxUint256) {
        calls.push({
          target: PUSD,
          value: "0",
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [exchange, maxUint256],
          }),
        })
      }
      if (!approved) {
        calls.push({
          target: CONDITIONAL_TOKENS,
          value: "0",
          data: encodeFunctionData({
            abi: erc1155Abi,
            functionName: "setApprovalForAll",
            args: [exchange, true],
          }),
        })
      }
    }

    let transactionHash: string | null = null
    if (calls.length > 0) {
      const deadline = Math.floor(Date.now() / 1000 + 600).toString()
      const response = await this.relayer(wallet).executeDepositWalletBatch(
        calls,
        depositWallet,
        deadline,
      )
      const confirmed = await response.wait()
      if (!confirmed)
        throw new ServiceUnavailableException(
          "Trading approval batch was not confirmed.",
        )
      transactionHash = confirmed.transactionHash || null
    }

    const checkedAt = new Date()
    const approvals: PolymarketApprovalState[] = []
    for (const exchange of EXCHANGES) {
      const [allowance, approved] = await Promise.all([
        publicClient.readContract({
          address: PUSD,
          abi: erc20Abi,
          functionName: "allowance",
          args: [depositWallet, exchange],
        }),
        publicClient.readContract({
          address: CONDITIONAL_TOKENS,
          abi: erc1155Abi,
          functionName: "isApprovedForAll",
          args: [depositWallet, exchange],
        }),
      ])
      approvals.push({
        spender: exchange.toLowerCase(),
        collateralApproved: allowance === maxUint256,
        conditionalTokensApproved: approved,
        checkedAt,
      })
    }
    if (
      approvals.some(
        (approval) =>
          !approval.collateralApproved || !approval.conditionalTokensApproved,
      )
    ) {
      throw new ServiceUnavailableException(
        "One or more Polymarket trading approvals failed verification.",
      )
    }
    return { approvals, transactionHash }
  }

  private relayer(wallet: CirclePolygonWallet): RelayClient {
    const credentials: BuilderApiKeyCreds = {
      key: this.required("POLYMARKET_BUILDER_API_KEY"),
      secret: this.required("POLYMARKET_BUILDER_SECRET"),
      passphrase: this.required("POLYMARKET_BUILDER_PASSPHRASE"),
    }
    return new RelayClient(
      RELAYER_URL,
      CHAIN_ID,
      this.walletClient(wallet),
      new BuilderConfig({ localBuilderCreds: credentials }),
    )
  }

  private walletClient(wallet: CirclePolygonWallet) {
    const circle = this.circle()
    const account = toAccount({
      address: wallet.address,
      signTypedData: async (typedData) => {
        const domain = typedData.domain ?? {}
        const types = typedData.types as TypedData
        const response = await circle.signTypedData({
          walletId: wallet.id,
          data: JSON.stringify(
            this.jsonSafe({
              domain,
              types: { EIP712Domain: this.eip712DomainTypes(domain), ...types },
              primaryType: typedData.primaryType,
              message: typedData.message,
            }),
          ),
          memo: "Authorize Verity Polymarket operation",
        })
        const signature = response.data?.signature as Hex | undefined
        if (!signature)
          throw new ServiceUnavailableException(
            "Circle did not return a typed-data signature.",
          )
        const hash = hashTypedData({
          domain,
          types,
          primaryType: typedData.primaryType,
          message: typedData.message,
        } as never)
        const recovered = await recoverAddress({ hash, signature })
        if (recovered.toLowerCase() !== wallet.address.toLowerCase()) {
          throw new ServiceUnavailableException(
            "Circle signature recovery did not match the wallet owner.",
          )
        }
        return signature
      },
      signMessage: () =>
        Promise.reject(new Error("Message signing is not supported.")),
      signTransaction: () =>
        Promise.reject(
          new Error("Direct transaction signing is not supported."),
        ),
    })
    return createWalletClient({
      account,
      chain: polygon,
      transport: http(
        this.configService.get<string>("POLYGON_RPC_URL") || undefined,
      ),
    })
  }

  private publicClient() {
    return createPublicClient({
      chain: polygon,
      transport: http(
        this.configService.get<string>("POLYGON_RPC_URL") || undefined,
      ),
    })
  }

  private circle(): CircleDeveloperControlledWalletsClient {
    if (!this.circleClient) {
      this.circleClient = initiateDeveloperControlledWalletsClient({
        apiKey: this.required("CIRCLE_API_KEY"),
        entitySecret: this.required("CIRCLE_ENTITY_SECRET"),
      })
    }
    return this.circleClient
  }

  private assertPolygonConfiguration(): void {
    const blockchain = this.required("CIRCLE_BLOCKCHAIN")
    if (blockchain !== "MATIC") {
      throw new InternalServerErrorException(
        "CIRCLE_BLOCKCHAIN must be MATIC for Polymarket provisioning.",
      )
    }
  }

  private required(name: string): string {
    const value = this.configService.get<string>(name)?.trim()
    if (!value)
      throw new InternalServerErrorException(`${name} is not configured.`)
    return value
  }

  private ensureWebCrypto(): void {
    if (!globalThis.crypto?.subtle) {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: webcrypto,
      })
    }
  }

  private eip712DomainTypes(domain: TypedDataDomain) {
    const fields: Array<{ name: string; type: string }> = []
    if (domain.name !== undefined) fields.push({ name: "name", type: "string" })
    if (domain.version !== undefined)
      fields.push({ name: "version", type: "string" })
    if (domain.chainId !== undefined)
      fields.push({ name: "chainId", type: "uint256" })
    if (domain.verifyingContract !== undefined)
      fields.push({ name: "verifyingContract", type: "address" })
    if (domain.salt !== undefined)
      fields.push({ name: "salt", type: "bytes32" })
    return fields
  }

  private jsonSafe(value: unknown): unknown {
    if (typeof value === "bigint") {
      return value <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(value)
        : value.toString()
    }
    if (Array.isArray(value)) return value.map((item) => this.jsonSafe(item))
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this.jsonSafe(item)]),
      )
    }
    return value
  }
}
