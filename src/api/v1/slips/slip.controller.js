import slipService from "./slip.service.js";
import transactionService from "../transactions/transaction.service.js";
import notificationService from "../notifications/notification.service.js";
import userMissionService from "../user-missions/user-mission.service.js";
import catchAsync from "../../../utils/catchAsync.js";
import httpStatus from "http-status";
import lineService from "../lines/line.service.js";

const slipVerify = catchAsync(async (req, res) => {
  const { userId, slipImageUrl, transactionId } = req.body;

  // ตรวจสอบสลิปด้วย url รูป
  const verifyResult = await slipService.verfifySlip(slipImageUrl, transactionId);

  let updatedTransaction;

  // 2. "แปลภาษา" และส่ง "คำสั่งภายใน" ที่ชัดเจน
  if (verifyResult.code === "200000" && verifyResult.data) {
    // คำสั่ง: "อนุมัติรายการฝากนี้"

    updatedTransaction = await transactionService.approveDeposit(transactionId, {
      userId: userId, // <-- ส่ง userId เข้าไป
      amount: verifyResult.data.amount,
      sender: verifyResult.data.sender, // หรือข้อมูลอื่นๆ ที่จำเป็น
    });
  } else {
    // คำสั่ง: "ปฏิเสธรายการฝากนี้"
    updatedTransaction = await transactionService.rejectDeposit(transactionId, {
      userId: userId,
      code: verifyResult.code,
      reason: verifyResult.message || "Slip verification failed.",
    });
  }

  res.status(httpStatus.OK).json({
    message: `Transaction ${transactionId} processed with status: ${updatedTransaction.status}`,
    data: updatedTransaction,
  });
});

export default { slipVerify };
