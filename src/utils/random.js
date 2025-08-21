import { customAlphabet } from 'nanoid';

export const generateUniqueWalletId = async (prisma) => {
  let walletId;
  let isUnique = false;
  const alphabet = '0123456789';
  const generateSixDigitId = customAlphabet(alphabet, 6);

  while (!isUnique) {
    const generatedId = generateSixDigitId();
    walletId = `1WL-${generatedId}`;
    const existingId = await prisma.wallet.findUnique({
      where: { walletId: walletId },
    });

    if (!existingId) {
      isUnique = true;
    }
  }
  return walletId;
};

export const generateUniqueReferralCode = async (prisma) => {
  let referralCode;
  let isUnique = false;

  while (!isUnique) {
    // สร้างรหัสด้วย nanoid (ปรับขนาดได้ เช่น 8 ตัว)
    referralCode = nanoid(8).toUpperCase(); // สร้างรหัส 8 ตัว

    const existingUser = await prisma.user.findUnique({
      where: { referralCode: referralCode },
    });

    if (!existingUser) {
      isUnique = true;
    }
  }
  return referralCode;
};

export default { generateUniqueWalletId, generateUniqueReferralCode };
