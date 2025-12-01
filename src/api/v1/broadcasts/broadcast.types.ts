export interface Broadcast {
  id: string;
  title: string;
  body?: string | null;
  status: string;
  sentAt?: Date | string | null;
  sentToUserCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}
