import { Injectable } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { randomUUID } from "node:crypto"
import { Model, Types } from "mongoose"
import {
  PolymarketAccount,
  PolymarketAccountDocument,
} from "./polymarket-account.model"
import {
  PolymarketAccountRecord,
  PolymarketProvisioningStatus,
} from "./polymarket-account.types"

@Injectable()
export class PolymarketAccountRepository {
  constructor(
    @InjectModel(PolymarketAccount.name)
    private readonly accountModel: Model<PolymarketAccountDocument>,
  ) {}

  async ensure(userId: string): Promise<PolymarketAccountRecord> {
    const objectId = new Types.ObjectId(userId)
    const document = await this.accountModel
      .findOneAndUpdate(
        { userId: objectId },
        {
          $setOnInsert: {
            userId: objectId,
            chainId: 137,
            circleBlockchain: "MATIC",
            status: PolymarketProvisioningStatus.Uninitialized,
            circleWalletIdempotencyKey: randomUUID(),
            clobCredentialNonce: 0,
            approvals: [],
            pusdBalanceBaseUnits: "0",
            fundingTransactions: [],
            provisioningAttempts: 0,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .select("+clobCredentialsEncrypted")
      .exec()
    return this.record(document)
  }

  async findByUserId(
    userId: string,
    includeCredentials = false,
  ): Promise<PolymarketAccountRecord | null> {
    const query = this.accountModel.findOne({
      userId: new Types.ObjectId(userId),
    })
    if (includeCredentials) query.select("+clobCredentialsEncrypted")
    const document = await query.exec()
    return document ? this.record(document) : null
  }

  async acquireLease(
    userId: string,
    leaseId: string,
    leaseUntil: Date,
  ): Promise<PolymarketAccountRecord | null> {
    const now = new Date()
    const document = await this.accountModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          status: { $ne: PolymarketProvisioningStatus.Ready },
          $or: [
            { provisioningLeaseUntil: null },
            { provisioningLeaseUntil: { $exists: false } },
            { provisioningLeaseUntil: { $lte: now } },
          ],
        },
        {
          $set: {
            provisioningLeaseId: leaseId,
            provisioningLeaseUntil: leaseUntil,
          },
          $inc: { provisioningAttempts: 1 },
        },
        { new: true },
      )
      .select("+clobCredentialsEncrypted")
      .exec()
    return document ? this.record(document) : null
  }

  async patch(
    userId: string,
    leaseId: string,
    values: Partial<PolymarketAccountRecord>,
  ): Promise<PolymarketAccountRecord> {
    const document = await this.accountModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), provisioningLeaseId: leaseId },
        { $set: values },
        { new: true },
      )
      .select("+clobCredentialsEncrypted")
      .exec()
    if (!document) throw new Error("Polymarket provisioning lease was lost.")
    return this.record(document)
  }

  async releaseLease(userId: string, leaseId: string): Promise<void> {
    await this.accountModel
      .updateOne(
        { userId: new Types.ObjectId(userId), provisioningLeaseId: leaseId },
        { $set: { provisioningLeaseId: null, provisioningLeaseUntil: null } },
      )
      .exec()
  }

  async updateFunding(
    userId: string,
    values: Partial<PolymarketAccountRecord>,
  ): Promise<PolymarketAccountRecord> {
    const document = await this.accountModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: values },
        { new: true },
      )
      .exec()
    if (!document) throw new Error("Polymarket account was not found.")
    return this.record(document)
  }

  private record(document: PolymarketAccountDocument): PolymarketAccountRecord {
    return document.toObject()
  }
}
