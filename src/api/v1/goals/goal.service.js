import prisma from "../../../libs/prisma.js";
import httpStatus from "http-status";

const createGoalForUser = async (userId, data) => {
  const newGoal = await prisma.goal.create({
    data: {
      user: { connect: { id: userId } },
      mobileModel: { connect: { id: data.mobileId } },
      plan: { connect: { id: data.planId } },
      status: "ACTIVE",
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
};

const updateGoalForUser = async (userId, data) => {
  const updatedGoal = await prisma.goal.update({
    where: {
      userId: userId,
    },
    data: data,
  });

  return updatedGoal;
};

const getUserGoal = async (line_user_id) => {
  if (!line_user_id) throw new ApiError(httpStatus.BAD_REQUEST);
  const goal = await prisma.goal.findFirst({
    where: {
      user: {
        line_user_id,
      },
    },
    select: {
      product: {
        select: {
          brand: true,
          model: true,
          downPaymentAmount: true,
          imageUrl: true,
        },
      },
    },
  });
  return goal;
};

export default { createGoalForUser, getUserGoal, updateGoalForUser };
