import { Role } from "../../../generated/prisma";

export interface User {
  id: string;
  line_user_id: string;
  line_display_name?: string | null;
  fullname?: string | null;
  phone?: string | null;
  pin?: string | null;
  occupation?: string | null;
  ageRange?: string | null;
  line_profile_url?: string | null;
  monthlyPayment?: number | null;
  chat_url?: string | null;
  isLocked?: boolean | null;
  referralCode: string;
  referToCode?: string | null;
  email?: string | null;
  firstTime: boolean;
  guideShown: boolean;
  role: Role;
  currentSavingStreak: number;
  longestSavingStreak: number;
  lastSavingActivity?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateUserWIthGoalPayload {
  ageRange: string;
  chat_url: string;
  email: string;
  fullname: string;
  line_display_name: string;
  line_profile_url: string;
  line_user_id: string;
  mobileId: string;
  monthlyPayment: string;
  occupation: string;
  phone: string;
  pin: string;
  planId: string;
  referToCode: string;
}
