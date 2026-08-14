import { Injectable } from "@nestjs/common"
import { randomUUID } from "node:crypto"
import type { Address } from "viem"
import { PolymarketAccountRepository } from "./polymarket-account.repository"
import {
  CirclePolygonWallet,
  PolymarketAccountRecord,
  PolymarketAccountView,
  PolymarketProvisioningStatus,
} from "./polymarket-account.types"
import { PolymarketCredentialCipher } from "./polymarket-credential-cipher.service"
import { PolymarketProvisioningGateway } from "./polymarket-provisioning.gateway"

const PROVISIONING_LEASE_MS = 10 * 60 * 1000

@Injectable()
export class PolymarketAccountService {
  constructor(
    private readonly repository: PolymarketAccountRepository,
    private readonly gateway: PolymarketProvisioningGateway,
    private readonly credentialCipher: PolymarketCredentialCipher,
  ) {}

  async getAccount(userId: string): Promise<PolymarketAccountView> {
    return this.view(await this.repository.ensure(userId))
  }

  async provision(userId: string): Promise<PolymarketAccountView> {
    const existing = await this.repository.ensure(userId)
    if (existing.status === PolymarketProvisioningStatus.Ready) {
      return this.view(existing)
    }

    const leaseId = randomUUID()
    let account = await this.repository.acquireLease(
      userId,
      leaseId,
      new Date(Date.now() + PROVISIONING_LEASE_MS),
    )
    if (!account) {
      return this.view((await this.repository.findByUserId(userId)) || existing)
    }

    try {
      let wallet = this.wallet(account)
      if (!wallet) {
        wallet = await this.gateway.createCircleWallet(
          userId,
          account.circleWalletIdempotencyKey,
        )
        account = await this.repository.patch(userId, leaseId, {
          circleWalletId: wallet.id,
          circleWalletAddress: wallet.address,
          status: PolymarketProvisioningStatus.CircleWalletReady,
          lastErrorCode: null,
          lastErrorMessage: null,
          lastErrorAt: null,
        })
      }

      if (!account.clobCredentialsEncrypted) {
        const credentials = await this.gateway.createClobCredentials(
          wallet,
          account.clobCredentialNonce,
        )
        account = await this.repository.patch(userId, leaseId, {
          clobCredentialsEncrypted: this.credentialCipher.encrypt(credentials),
          status: PolymarketProvisioningStatus.ClobCredentialsReady,
        })
      }

      let depositWallet = account.depositWalletAddress as Address | null
      if (!depositWallet) {
        depositWallet = await this.gateway.deriveDepositWallet(wallet)
        account = await this.repository.patch(userId, leaseId, {
          depositWalletAddress: depositWallet.toLowerCase(),
          status: PolymarketProvisioningStatus.DepositWalletDerived,
        })
      }

      account = await this.repository.patch(userId, leaseId, {
        status: PolymarketProvisioningStatus.DeploymentPending,
      })
      const deployment = await this.gateway.ensureDepositWallet(
        wallet,
        depositWallet,
      )
      account = await this.repository.patch(userId, leaseId, {
        ...(deployment.transactionHash
          ? {
              deploymentTransactionHash:
                deployment.transactionHash.toLowerCase(),
            }
          : {}),
        status: PolymarketProvisioningStatus.ApprovalsPending,
      })

      const approvalResult = await this.gateway.ensureTradingApprovals(
        wallet,
        depositWallet,
      )
      account = await this.repository.patch(userId, leaseId, {
        approvals: approvalResult.approvals,
        ...(approvalResult.transactionHash
          ? {
              approvalTransactionHash:
                approvalResult.transactionHash.toLowerCase(),
            }
          : {}),
        status: PolymarketProvisioningStatus.Ready,
        readyAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
        lastErrorAt: null,
      })
    } catch (error) {
      const failure = this.failure(error)
      account = await this.repository.patch(userId, leaseId, {
        status: PolymarketProvisioningStatus.FailedRetryable,
        lastErrorCode: failure.code,
        lastErrorMessage: failure.message,
        lastErrorAt: new Date(),
      })
    } finally {
      await this.repository.releaseLease(userId, leaseId)
      account.provisioningLeaseId = null
      account.provisioningLeaseUntil = null
    }

    return this.view(account)
  }

  private wallet(account: PolymarketAccountRecord): CirclePolygonWallet | null {
    if (!account.circleWalletId || !account.circleWalletAddress) return null
    return {
      id: account.circleWalletId,
      address: account.circleWalletAddress as Address,
    }
  }

  private view(account: PolymarketAccountRecord): PolymarketAccountView {
    const provisioning = Boolean(
      account.provisioningLeaseUntil &&
      account.provisioningLeaseUntil.getTime() > Date.now() &&
      account.status !== PolymarketProvisioningStatus.Ready,
    )
    const hasError = Boolean(account.lastErrorCode || account.lastErrorMessage)
    return {
      status: account.status,
      chainId: account.chainId,
      circleBlockchain: account.circleBlockchain,
      circleWalletAddress: account.circleWalletAddress || null,
      depositWalletAddress: account.depositWalletAddress || null,
      deploymentTransactionHash: account.deploymentTransactionHash || null,
      approvalTransactionHash: account.approvalTransactionHash || null,
      approvals: account.approvals || [],
      provisioning,
      lastError: hasError
        ? {
            code: account.lastErrorCode || "POLYMARKET_PROVISIONING_FAILED",
            message:
              account.lastErrorMessage ||
              "Polymarket account provisioning could not complete.",
            at: account.lastErrorAt || null,
          }
        : null,
      readyAt: account.readyAt || null,
      createdAt: account.createdAt || null,
      updatedAt: account.updatedAt || null,
    }
  }

  private failure(error: unknown): { code: string; message: string } {
    const raw =
      error instanceof Error ? error.message : "Unknown upstream error"
    const configurationError =
      /not configured|must be MATIC|exactly 32 bytes/i.test(raw)
    return {
      code: configurationError
        ? "POLYMARKET_CONFIGURATION_ERROR"
        : "POLYMARKET_PROVISIONING_FAILED",
      message: configurationError
        ? "Polymarket account provisioning is not configured correctly."
        : "Polymarket account provisioning could not complete. It is safe to retry.",
    }
  }
}
