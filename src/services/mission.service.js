import prisma from '../libs/prisma.js';

const getMissions = () => {};

const createMission = async ({ title, description, rewardAmount }, durationInDays) => {
  // Calculate the expiration date by adding the duration to the current date
  const webExpiresAt = new Date();
  webExpiresAt.setDate(webExpiresAt.getDate() + durationInDays);
  const newMission = await prisma.mission.create({
    data: {
      title,
      description,
      rewardAmount: parseFloat(rewardAmount),
      webExpiresAt, // eSt the calculated expiration date
    },
  });

  return newMission;
};

const getActiveMissions = async () => {
  return await prisma.mission.findMany({ where: { webExpiresAt: { gt: new Date() } } });
};

const getAvailableMissions = async (userId) => {
  const availableMissions = await prisma.mission.findMany({
    where: {
      webExpiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return availableMissions;
};

export default {
  createMission,
  getAvailableMissions,
  getActiveMissions,
};
