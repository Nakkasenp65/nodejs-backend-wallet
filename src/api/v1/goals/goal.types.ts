import { GoalStatus } from "@prisma/client";

export interface Goal {
  id: string;
  status: GoalStatus;
  planId: string;
  userId: string;
  productId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
