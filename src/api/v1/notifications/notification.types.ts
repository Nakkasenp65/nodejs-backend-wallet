import { NotificationType } from "../../../generated/prisma";

export interface Notification {
  id: string;
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  type: NotificationType;
  isRead: boolean;
  userId: string;
  transactionId?: string | null;
  createdAt: Date | string;
}
