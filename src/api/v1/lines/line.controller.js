import lineService from "../lines/line.service.js";
import catchAsync from "../../../utils/catchAsync.js";
import httpStatus from "http-status";

const sendFlexMessage = catchAsync(async (req, res) => {
  const date = new Date();
  // const response = await lineService.sendDepositFlexMessage('68a05de8beea7095b825bfff', 'MR. Nakasen P', 'xxx-x-x9320-x', 'กสิกรไทย', 120, date);
  const response = await lineService.sendWithdrawSuccessFlex(
    "U006fb519ba07650932c6981af95d0620",
    100,
    876,
    "1WL-227823",
    "นาคเสน พุทธเจริญ",
    "ธนาคารกสิกรไทย - 0543693200",
    "ธนาคารกสิกรไทย",
    date,
  );
  res.status(httpStatus.OK).json(response);
});

export default {
  sendFlexMessage,
};
