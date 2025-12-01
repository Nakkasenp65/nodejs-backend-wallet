import { UserMissionStatus } from "../../../generated/prisma";

export interface UserMission {
  id: string;
  currentProgress: number;
  completeProgress: number;
  status: UserMissionStatus;
  enrolledAt: Date | string;
  userExpiresAt: Date | string;
  completedAt?: Date | string | null;
  claimExpiresAt?: Date | string | null;
  claimedAt?: Date | string | null;
  userId: string;
  missionId?: string | null;
}
