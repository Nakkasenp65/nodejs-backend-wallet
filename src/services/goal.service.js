import prisma from '../libs/prisma.js';

async function createGoalForUser(userId, data) {
  const newGoal = await prisma.goal.create({
    data: {
      user: { connect: { id: userId } },
      mobileModel: { connect: { id: data.mobileId } },
      plan: { connect: { id: data.planId } },
      status: 'ACTIVE',
    },
    include: {
      mobileModel: true,
      plan: true,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { firstTime: false },
  });

  return newGoal;
}

async function updateGoalForUser(userId, data) {
  const updatedGoal = await prisma.goal.update({
    where: {
      userId: userId,
    },
    data: data,
  });

  return updatedGoal;
}

export default { createGoalForUser, updateGoalForUser };
