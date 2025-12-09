import prisma from "../libs/prisma";
import transactionService from "../api/v1/transactions/transaction.service";
import userMissionService from "../api/v1/user-missions/user-mission.service";

describe("Mission Deposit Verification", () => {
  jest.setTimeout(30000); // Increase timeout to 30s for DB operations
  const timestamp = Date.now();
  const testUserLineId = `test_line_${timestamp}_jest`;
  const testWalletId = `1WL-TEST-${timestamp}-jest`;
  const testReferralCode = `REF-${timestamp}-jest`;

  let userId: string;
  let walletId: string;
  let missionId: string;
  let transactionId: string;

  beforeAll(async () => {
    // 1. Create User
    const user = await prisma.user.create({
      data: {
        line_user_id: testUserLineId,
        line_display_name: `TestUser_${timestamp}_jest`,
        referralCode: testReferralCode,
      },
    });
    userId = user.id;

    // 2. Create Wallet
    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        walletUniqueId: testWalletId,
        balance: 0,
        bonusBalance: 0,
      },
    });
    walletId = wallet.id;

    // 3. Create Mission
    const mission = await prisma.mission.create({
      data: {
        title: `Test Deposit Mission ${timestamp} Jest`,
        description: "Test mission for deposit",
        type: "ONBOARDING",
        rewardAmount: 10,
        completeProgress: 1,
      },
    });
    missionId = mission.id;

    // 4. Enroll User
    await userMissionService.enrollInMission(userId, missionId);
  });

  afterAll(async () => {
    // Teardown
    try {
      await prisma.user.delete({ where: { line_user_id: testUserLineId } });
      await prisma.mission.delete({ where: { id: missionId } });
    } catch (error) {
      console.error("Teardown failed:", error);
    }
    await prisma.$disconnect();
  });

  it("should update mission progress when a deposit is approved", async () => {
    // 5. Create Pending Transaction
    const transaction = await prisma.transaction.create({
      data: {
        name: "ฝากเงินออม",
        type: "DEPOSIT",
        status: "PENDING",
        from: "Test Sender",
        to: testWalletId,
        description: "Test pending deposit",
        slipImageUrl: "http://example.com/slip.jpg",
        toWalletId: walletId,
        amount: null,
        verified: false,
        verifiedAmount: null,
      },
    });
    transactionId = transaction.id;

    // 6. Approve Transaction
    await transactionService.approveDeposit(transactionId, {
      userId: userId,
      amount: 100,
      sender: {
        bank: { name: "Test Bank" },
        account: {
          name: "Sender Name",
          bank: { account: "123456" },
        },
      } as any,
    });

    // 7. Verify Mission Progress
    const userMission = await prisma.userMission.findUnique({
      where: {
        userId_missionId: {
          userId: userId,
          missionId: missionId,
        },
      },
    });

    expect(userMission).toBeDefined();
    expect(userMission?.status).toBe("AWAITING_CLAIM");
    expect(userMission?.currentProgress).toBeGreaterThanOrEqual(1);
  });

  it("should update referrer's mission progress when a newcomer makes first deposit", async () => {
    // 1. Create Referrer
    const referrer = await prisma.user.create({
      data: {
        line_user_id: `referrer_${timestamp}`,
        line_display_name: `Referrer_${timestamp}`,
        referralCode: `REF_M_${timestamp}`,
      },
    });

    // 2. Create Referee (Newcomer)
    const referee = await prisma.user.create({
      data: {
        line_user_id: `referee_${timestamp}`,
        line_display_name: `Referee_${timestamp}`,
        referralCode: `REF_N_${timestamp}`,
        firstTime: true, // Crucial: must be first time
      },
    });

    // 3. Create Referee Wallet
    const refereeWallet = await prisma.wallet.create({
      data: {
        userId: referee.id,
        walletUniqueId: `1WL-REF-${timestamp}`,
        balance: 0,
      },
    });

    // 4. Link them with Referral Record
    await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        newcomerId: referee.id,
      },
    });

    // 5. Create Referral Mission
    const referralMission = await prisma.mission.create({
      data: {
        title: `Referral Mission ${timestamp}`,
        type: "REFERRAL",
        rewardAmount: 50,
        completeProgress: 1,
      },
    });

    // 6. Enroll Referrer in Mission
    await userMissionService.enrollInMission(referrer.id, referralMission.id);

    // 7. Referee makes a deposit
    const transaction = await prisma.transaction.create({
      data: {
        name: "ฝากเงินครั้งแรก",
        type: "DEPOSIT",
        status: "PENDING",
        from: "Newcomer Sender",
        to: refereeWallet.walletUniqueId,
        slipImageUrl: "http://example.com/slip_ref.jpg",
        toWalletId: refereeWallet.id,
        amount: null,
        verified: false,
        verifiedAmount: null,
      },
    });

    // 8. Approve Referee's Deposit
    await transactionService.approveDeposit(transaction.id, {
      userId: referee.id,
      amount: 500, // Enough to be valid
      sender: {
        bank: { name: "Test Bank" },
        account: {
          name: "Newcomer Name",
          bank: { account: "987654" },
        },
      } as any,
    });

    // 9. Verify Referrer's Mission Progress
    const referrerMission = await prisma.userMission.findUnique({
      where: {
        userId_missionId: {
          userId: referrer.id,
          missionId: referralMission.id,
        },
      },
    });

    expect(referrerMission).toBeDefined();
    // Progress should increment by 1
    expect(referrerMission?.currentProgress).toBeGreaterThanOrEqual(1);

    // Clean up specific to this test
    // (Note: In a real suite, we might use transaction rollback or separate cleanups)
    await prisma.transaction.deleteMany({ where: { toWalletId: refereeWallet.id } });
    await prisma.referral.deleteMany({ where: { newcomerId: referee.id } });
    await prisma.wallet.delete({ where: { id: refereeWallet.id } });
    await prisma.userMission.deleteMany({ where: { userId: referrer.id } });
    await prisma.mission.delete({ where: { id: referralMission.id } });
    await prisma.user.delete({ where: { id: referrer.id } });
    await prisma.user.delete({ where: { id: referee.id } });
  });

  it("should update ACCUMULATION mission progress with deposit amount", async () => {
    // 1. Create Accumulation Mission
    const accMission = await prisma.mission.create({
      data: {
        title: `Accumulation Mission ${timestamp}`,
        type: "ACCUMULATION",
        rewardAmount: 20,
        completeProgress: 1000,
      },
    });

    // 2. Enroll User
    await userMissionService.enrollInMission(userId, accMission.id);

    // 3. Deposit Amount
    const depositAmount = 500;
    const transaction = await prisma.transaction.create({
      data: {
        name: "ฝากสะสม",
        type: "DEPOSIT",
        status: "PENDING",
        from: "Acc Sender",
        to: testWalletId,
        slipImageUrl: "http://example.com/slip_acc.jpg",
        toWalletId: walletId,
        amount: null,
        verified: false,
        verifiedAmount: null,
      },
    });

    // 4. Approve
    await transactionService.approveDeposit(transaction.id, {
      userId: userId,
      amount: depositAmount,
      sender: {
        bank: { name: "Test Bank" },
        account: { name: "Sender", bank: { account: "123" } },
      } as any,
    });

    // 5. Verify
    const userMission = await prisma.userMission.findUnique({
      where: { userId_missionId: { userId, missionId: accMission.id } },
    });

    expect(userMission?.currentProgress).toBe(depositAmount);

    // Cleanup
    await prisma.mission.delete({ where: { id: accMission.id } });
    await prisma.userMission.delete({ where: { id: userMission!.id } });
    await prisma.transaction.delete({ where: { id: transaction.id } });
  });

  it("should update STREAK mission progress on new day deposit", async () => {
    // 1. Create Streak Mission
    const streakMission = await prisma.mission.create({
      data: {
        title: `Streak Mission ${timestamp}`,
        type: "STREAK",
        rewardAmount: 30,
        completeProgress: 3,
      },
    });

    // 2. Enroll User
    await userMissionService.enrollInMission(userId, streakMission.id);

    // 3. Mock previous activity to be yesterday (to allow streak increment)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await prisma.user.update({
      where: { id: userId },
      data: { lastSavingActivity: yesterday },
    });

    // 4. Deposit
    const transaction = await prisma.transaction.create({
      data: {
        name: "ฝาก Streak",
        type: "DEPOSIT",
        status: "PENDING",
        from: "Streak Sender",
        to: testWalletId,
        slipImageUrl: "http://example.com/slip_streak.jpg",
        toWalletId: walletId,
        amount: null,
        verified: false,
        verifiedAmount: null,
      },
    });

    // 5. Approve
    await transactionService.approveDeposit(transaction.id, {
      userId: userId,
      amount: 100,
      sender: {
        bank: { name: "Test Bank" },
        account: { name: "Sender", bank: { account: "123" } },
      } as any,
    });

    // 6. Verify Progress Incremented
    const userMission = await prisma.userMission.findUnique({
      where: { userId_missionId: { userId, missionId: streakMission.id } },
    });
    expect(userMission?.currentProgress).toBe(1);

    // 7. Verify lastSavingActivity updated to today
    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    const now = new Date();
    expect(updatedUser?.lastSavingActivity?.getDate()).toBe(now.getDate());

    // 8. Try another deposit SAME DAY -> Progress should NOT increment
    const transaction2 = await prisma.transaction.create({
      data: {
        name: "ฝาก Streak 2",
        type: "DEPOSIT",
        status: "PENDING",
        from: "Streak Sender",
        to: testWalletId,
        slipImageUrl: "http://example.com/slip_streak2.jpg",
        toWalletId: walletId,
        amount: null,
        verified: false,
        verifiedAmount: null,
      },
    });

    await transactionService.approveDeposit(transaction2.id, {
      userId: userId,
      amount: 100,
      sender: {
        bank: { name: "Test Bank" },
        account: { name: "Sender", bank: { account: "123" } },
      } as any,
    });

    const userMissionNoInc = await prisma.userMission.findUnique({
      where: { userId_missionId: { userId, missionId: streakMission.id } },
    });
    expect(userMissionNoInc?.currentProgress).toBe(1); // Still 1

    // Cleanup
    await prisma.mission.delete({ where: { id: streakMission.id } });
    await prisma.userMission.delete({ where: { id: userMission!.id } });
    await prisma.transaction.delete({ where: { id: transaction.id } });
    await prisma.transaction.delete({ where: { id: transaction2.id } });
  });
});
