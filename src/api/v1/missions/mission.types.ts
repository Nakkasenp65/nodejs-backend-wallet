import { MissionType } from "@prisma/client"

export interface Mission {
  id: string;
  title:string;
  description:string;
  type:MissionType;
  rewardAmount:number;
  webExpiresAt:string;
  durationDays:number;
  completeProgress:number;
  createdAt:string;
  updatedAt:string;
}