import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";
import httpStatus from "http-status";
import userMissionService from "../../user-mission.service";
import prisma from "../../../../../libs/prisma";
import ApiError from "../../../../../utils/ApiError";

// Mock Prisma
jest.mock("../../../../../libs/prisma", () => {
  const mockPrisma: any = {
    userMission: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    mission: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    wallet: {
      create: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
  };
  mockPrisma.$transaction = jest.fn((callback: any) => callback(mockPrisma));
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

describe("User Mission Service", () => {
  const mockUserId = "user-123";
  const mockMissionId = "mission-123";
  const mockUserMissionId = "user-mission-123";

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("enrollInMission", () => {
    it("should enroll user in mission successfully", async () => {
      const mockMission = {
        id: mockMissionId,
        type: "ONBOARDING",
        webExpiresAt: null,
        durationDays: 7,
        completeProgress: 1,
      };

      (prisma.mission.findUnique as jest.Mock<any>).mockResolvedValue(mockMission);
      (prisma.userMission.findUnique as jest.Mock<any>).mockResolvedValue(null); // No existing enrollment
      (prisma.userMission.findFirst as jest.Mock<any>).mockResolvedValue(null); // No active same type
      (prisma.userMission.create as jest.Mock<any>).mockResolvedValue({
        id: mockUserMissionId,
        status: "ENROLLED",
        missionId: mockMissionId,
        userId: mockUserId,
      });

      const result = await userMissionService.enrollInMission(mockUserId, mockMissionId);

      expect(prisma.mission.findUnique).toHaveBeenCalledWith({
        where: { id: mockMissionId },
        select: expect.any(Object),
      });
      expect(prisma.userMission.create).toHaveBeenCalled();
      expect(result).toHaveProperty("status", "ENROLLED");
    });

    it("should throw error if mission not found", async () => {
      (prisma.mission.findUnique as jest.Mock<any>).mockResolvedValue(null);

      await expect(userMissionService.enrollInMission(mockUserId, mockMissionId)).rejects.toThrow(
        new ApiError(httpStatus.NOT_FOUND, "Mission not found"),
      );
    });

    it("should throw error if mission allows expired enrollment", async () => {
      const mockMission = {
        id: mockMissionId,
        webExpiresAt: new Date(Date.now() - 10000), // Expired
      };
      (prisma.mission.findUnique as jest.Mock<any>).mockResolvedValue(mockMission);

      await expect(userMissionService.enrollInMission(mockUserId, mockMissionId)).rejects.toThrow(
        new ApiError(httpStatus.BAD_REQUEST, "This mission is no longer available for enrollment."),
      );
    });

    it("should throw error if user already enrolled", async () => {
      const mockMission = { id: mockMissionId };
      (prisma.mission.findUnique as jest.Mock<any>).mockResolvedValue(mockMission);
      (prisma.userMission.findUnique as jest.Mock<any>).mockResolvedValue({ id: "existing" });

      await expect(userMissionService.enrollInMission(mockUserId, mockMissionId)).rejects.toThrow(
        new ApiError(httpStatus.CONFLICT, "User is already enrolled in this mission"),
      );
    });
  });

  describe("claimMissionReward", () => {
    it("should claim reward successfully", async () => {
      const mockUserMission = {
        id: mockUserMissionId,
        userId: mockUserId,
        status: "AWAITING_CLAIM",
        claimExpiresAt: new Date(Date.now() + 10000),
        mission: { rewardAmount: 100, title: "Test Mission" },
        user: { wallet: { id: "wallet-123" } },
      };

      (prisma.userMission.findUnique as jest.Mock<any>).mockResolvedValue(mockUserMission);
      (prisma.transaction.create as jest.Mock<any>).mockResolvedValue({});
      (prisma.wallet.update as jest.Mock<any>).mockResolvedValue({});
      (prisma.userMission.update as jest.Mock<any>).mockResolvedValue({ status: "CLAIMED" });

      const result = await userMissionService.claimMissionReward(mockUserId, mockUserMissionId);

      expect(prisma.transaction.create).toHaveBeenCalled();
      expect(prisma.wallet.update).toHaveBeenCalled();
      expect(prisma.userMission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserMissionId },
          data: expect.objectContaining({ status: "CLAIMED" }),
        }),
      );
    });

    it("should throw error if mission not found or invalid user", async () => {
      (prisma.userMission.findUnique as jest.Mock<any>).mockResolvedValue(null);
      await expect(userMissionService.claimMissionReward(mockUserId, mockUserMissionId)).rejects.toThrow(ApiError);
    });

    it("should throw error if status is not AWAITING_CLAIM", async () => {
      const mockUserMission = {
        id: mockUserMissionId,
        userId: mockUserId,
        status: "ENROLLED",
        user: { wallet: {} },
      };
      (prisma.userMission.findUnique as jest.Mock<any>).mockResolvedValue(mockUserMission);
      await expect(userMissionService.claimMissionReward(mockUserId, mockUserMissionId)).rejects.toThrow(
        "This mission is not available for claiming.",
      );
    });
  });

  describe("getMyMissions", () => {
    it("should return missions with default filter (active)", async () => {
      (prisma.userMission.findMany as jest.Mock<any>).mockResolvedValue([]);
      await userMissionService.getMyMissions(mockUserId);
      expect(prisma.userMission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: ["ENROLLED", "AWAITING_CLAIM"] } }),
        }),
      );
    });

    it("should return missions with history filter", async () => {
      (prisma.userMission.findMany as jest.Mock<any>).mockResolvedValue([]);
      await userMissionService.getMyMissions(mockUserId, { filter: "history" });
      expect(prisma.userMission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: ["CLAIMED", "EXPIRED", "CLAIM_EXPIRED"] } }),
        }),
      );
    });
  });

  describe("checkAndUpdateMissionProgress", () => {
    it("should increment progress for ONBOARDING on DEPOSIT_SUCCESS", async () => {
      const mockMission = { id: mockUserMissionId, mission: { type: "ONBOARDING" }, currentProgress: 0 };
      (prisma.userMission.findMany as jest.Mock<any>).mockResolvedValue([mockMission]);
      (prisma.userMission.update as jest.Mock<any>).mockResolvedValue({});

      await userMissionService.checkAndUpdateMissionProgress(mockUserId, "DEPOSIT_SUCCESS", {});

      expect(prisma.userMission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { currentProgress: { increment: 1 } },
        }),
      );
    });
  });
});
