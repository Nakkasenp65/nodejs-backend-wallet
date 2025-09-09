import prisma from '../libs/prisma.js';

const getPlans = async () => {
  return await prisma.plan.findMany();
};

export default { getPlans };
