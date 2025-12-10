import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";
import httpStatus from "http-status";
import { Request, Response } from "express";
import userMissionController from "../../user-mission.controller";
import userMissionService from "../../user-mission.service";

// Mock dependencies
jest.mock("../../../../../utils/catchAsync.js", () => (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
});
jest.mock("../../user-mission.service");

describe("User Mission Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("enrollInMission", () => {
    it("should enroll user and return 201", async () => {
      const mockResult = { id: "mission-1", status: "ENROLLED" };
      req.body = { userId: "user-1", missionId: "mission-1" };
      (userMissionService.enrollInMission as jest.Mock<any>).mockResolvedValue(mockResult);

      await userMissionController.enrollInMission(req as Request, res as Response, jest.fn());

      expect(userMissionService.enrollInMission).toHaveBeenCalledWith("user-1", "mission-1");
      expect(res.status).toHaveBeenCalledWith(httpStatus.CREATED);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe("claimMissionReward", () => {
    it("should claim reward and return 200", async () => {
      const mockResult = { status: "CLAIMED" };
      req.body = { userId: "user-1", userMissionId: "um-1" };
      (userMissionService.claimMissionReward as jest.Mock<any>).mockResolvedValue(mockResult);

      await userMissionController.claimMissionReward(req as Request, res as Response, jest.fn());

      expect(userMissionService.claimMissionReward).toHaveBeenCalledWith("user-1", "um-1");
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe("getMyMissions", () => {
    it("should get missions with filter", async () => {
      const mockMissions = [{ id: 1 }];
      req.params = { userId: "user-1" };
      req.query = { filter: "history" };
      (userMissionService.getMyMissions as jest.Mock<any>).mockResolvedValue(mockMissions);

      await userMissionController.getMyMissions(req as Request, res as Response, jest.fn());

      expect(userMissionService.getMyMissions).toHaveBeenCalledWith("user-1", { filter: "history" });
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockMissions);
    });
  });

  describe("getMyMissionDetails", () => {
    it("should get mission details", async () => {
      const mockDetails = { id: "um-1" };
      req.params = { userMissionId: "um-1" };
      (userMissionService.getMyMissionDetails as jest.Mock<any>).mockResolvedValue(mockDetails);

      await userMissionController.getMyMissionDetails(req as Request, res as Response, jest.fn());

      expect(userMissionService.getMyMissionDetails).toHaveBeenCalledWith("um-1");
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockDetails);
    });

    it("should throw error if not found", async () => {
      req.params = { userMissionId: "um-1" };
      (userMissionService.getMyMissionDetails as jest.Mock<any>).mockResolvedValue(null);

      // Since controller uses catchAsync, it will call next(error) or throw depending on implementation.
      // But catchAsync usually wraps functionality.
      // If I call the raw function, it might just return promise rejection.
      // However, catchAsync usually looks like: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => next(err));
      // So I need to mock 'next' and check if it was called with error.

      const next = jest.fn();
      await userMissionController.getMyMissionDetails(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.anything()); // Expect API Error
      // Ideally check instance of ApiError
    });
  });

  describe("deleteUserMission", () => {
    it("should delete user mission", async () => {
      const mockDeleted = { id: "um-1" };
      req.params = { userMissionId: "um-1" };
      (userMissionService.deleteUserMission as jest.Mock<any>).mockResolvedValue(mockDeleted);

      await userMissionController.deleteUserMission(req as Request, res as Response, jest.fn());

      expect(userMissionService.deleteUserMission).toHaveBeenCalledWith("um-1");
      expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockDeleted);
    });
  });
});
