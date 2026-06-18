import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types } from "mongoose"
import { User, UserDocument } from "../users/users.model"
import { Mission, MissionDocument } from "./missions.model"
import { CreateMissionDto, UpdateMissionDto } from "./missions.dto"

@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name)

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Mission.name) private readonly missionModel: Model<MissionDocument>,
  ) {}

  async getMissions(userId: string, admin = false) {
    const user = await this.userModel.findById(userId)
    if (!user) throw new NotFoundException("User not found.")

    const query = admin ? {} : { isActive: true }
    const missions = await this.missionModel.find(query).sort({ createdAt: -1 })

    const completedSet = new Set(user.completedMissions || [])

    return missions.map((m) => {
      const missionObj = m.toObject()
      return {
        id: missionObj._id.toString(),
        title: missionObj.title,
        description: missionObj.description,
        xpReward: missionObj.xpReward,
        actionUrl: missionObj.actionUrl,
        isActive: missionObj.isActive,
        completed: completedSet.has(missionObj._id.toString()),
      }
    })
  }

  async completeMission(userId: string, missionId: string) {
    const user = await this.userModel.findById(userId)
    if (!user) throw new NotFoundException("User not found.")

    if (!Types.ObjectId.isValid(missionId)) {
      throw new BadRequestException("Invalid mission ID format.")
    }

    const mission = await this.missionModel.findById(missionId)
    if (!mission || !mission.isActive) {
      throw new NotFoundException("Mission not found or inactive.")
    }

    const completedMissions = user.completedMissions || []
    if (completedMissions.includes(missionId)) {
      throw new BadRequestException("Mission already completed.")
    }

    // Update user's completed missions array and increment their arenaXp
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        $push: { completedMissions: missionId },
        $inc: { arenaXp: mission.xpReward },
      },
      { new: true },
    )

    this.logger.log(
      `User ${user.username} (${userId}) completed mission ${mission.title} (${missionId}) and earned ${mission.xpReward} XP. Total XP is now ${updatedUser?.arenaXp}.`,
    )

    return {
      success: true,
      xpEarned: mission.xpReward,
      totalXp: updatedUser?.arenaXp ?? 0,
      completedMissions: updatedUser?.completedMissions ?? [],
    }
  }

  // --- Admin Methods ---

  async createMission(dto: CreateMissionDto) {
    const mission = new this.missionModel({
      title: dto.title,
      description: dto.description ?? "",
      xpReward: dto.xpReward,
      actionUrl: dto.actionUrl,
      isActive: true,
    })
    const saved = await mission.save()
    this.logger.log(`Admin created new mission: ${saved.title} (ID: ${saved._id})`)
    return saved
  }

  async updateMission(id: string, dto: UpdateMissionDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid mission ID format.")
    }

    const updated = await this.missionModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true },
    )

    if (!updated) throw new NotFoundException("Mission not found.")
    this.logger.log(`Admin updated mission ID: ${id}`)
    return updated
  }

  async deleteMission(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid mission ID format.")
    }

    const deleted = await this.missionModel.findByIdAndDelete(id)
    if (!deleted) throw new NotFoundException("Mission not found.")
    this.logger.log(`Admin deleted mission ID: ${id}`)
    return { success: true }
  }
}
