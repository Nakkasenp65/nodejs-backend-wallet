import ApiError from "./ApiError.js";
import httpStatus from "http-status";

export const flexMessage = (mode = null, line_user_id, payload = {}) => {
  const LIFF_URL = process.env.LIFF_URL;

  if (!LIFF_URL)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "LIFF URL is not defined",
    );

  if (mode === "register") {
    //เช็คข้อมูุลที่ใช้
    const { walletUniqueId, fullname, phone, balance } = payload;

    if (!walletUniqueId || !fullname || !phone || !balance)
      throw new ApiError(httpStatus.BAD_REQUEST, "Flex message content failed");

    return {
      // <-------------------- FLEX MESSAGE : ฝากเงิน -------------------->
      to: line_user_id,
      messages: [
        {
          type: "flex",
          altText: `📢 แจ้งเตือน เปิด 1 Wallet สำเร็จ Wallet Id: ...`,
          contents: {
            type: "bubble",
            size: "mega",
            hero: {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "image",
                  size: "full",
                  animated: true,
                  url: "https://lh3.googleusercontent.com/d/1Ykf_Ph5JHrnWZRyXufzh4aiq_OlvYDP7",
                  aspectRatio: "6:2",
                  aspectMode: "cover",
                },
              ],
              justifyContent: "flex-end",
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",
                          text: "เปิด 1 Wallet สำเร็จ!",
                          weight: "bold",
                          flex: 0,
                        },
                        {
                          type: "image",
                          url: "https://lh3.googleusercontent.com/d/1Z44ENRlcljinDd47R3u6OO8QU0e03s3j",
                          size: "25%",
                          animated: true,
                          offsetBottom: "8px",
                          offsetStart: "-40px",
                        },
                      ],
                    },
                    {
                      type: "separator",
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",
                          text: "1 Wallet ID:",
                          flex: 0,
                          size: "sm",
                          weight: "bold",
                          color: "#000000",
                        },
                        {
                          type: "text",
                          // wallet Id
                          text: `${walletUniqueId}`,
                          align: "end",
                          size: "sm",
                          offsetTop: "2px",
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",
                          text: "ชื่อผู้ฝาก:",
                          flex: 0,
                          size: "sm",
                          color: "#000000",
                          weight: "bold",
                        },
                        {
                          type: "text",
                          // ชื่อผู้ใช้ ชื่อจริง
                          text: `${fullname}`,
                          align: "end",
                          size: "sm",
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",
                          text: "เบอร์โทร:",
                          flex: 0,
                          size: "sm",
                          weight: "bold",
                          color: "#000000",
                        },
                        {
                          type: "text",
                          // เบอร์โทร
                          text: `${phone}`,
                          align: "end",
                          size: "sm",
                          offsetTop: "2px",
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",
                          text: "ยอดเงินคงเหลือ:",
                          flex: 0,
                          size: "sm",
                          weight: "bold",
                          color: "#000000",
                        },
                        {
                          type: "text",
                          // wallBalance
                          text: `${balance}`,
                          align: "end",
                          size: "sm",
                          color: "#ff3366",
                          weight: "bold",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "separator",
                  margin: "5px",
                },
                {
                  type: "button",
                  action: {
                    type: "uri",
                    label: "เข้าสู่ระบบออมดาวน์",
                    uri: LIFF_URL,
                  },
                  height: "sm",
                  style: "primary",
                  color: "#ff815a",
                  offsetTop: "8px",
                },
              ],
            },
          },
        },
      ],
    };
  }

  // REQUIRED: amount, fullnameWithBankNumber, bankName, bankIcon, walletUniqueId, date, balance
  if (mode === "save") {
    const {
      amount,
      fullnameWithBankNumber,
      walletUniqueId,
      date,
      balance,
      bankName,
      bankIcon,
    } = payload;
    if (
      !amount ||
      !fullnameWithBankNumber ||
      !walletUniqueId ||
      !date ||
      !balance
    )
      throw new ApiError(httpStatus.BAD_REQUEST, "Failed flex message");

    const formattedAmount = amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedBalance = balance.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      // <-------------------- FLEX MESSAGE : เติมเงิน -------------------->
      to: line_user_id,
      messages: [
        {
          type: "flex",
          // <-------------------- [data] จำนวนเงินที่สำเร็จ -------------------->
          altText: `📢 แจ้งเตือน 1 Wallet ออมเงินสำเร็จ จำนวน ${formattedAmount} บาท 💵`,
          contents: {
            type: "bubble",
            size: "mega",
            hero: {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "image",
                  size: "100%",
                  animated: true,
                  url: "https://lh3.googleusercontent.com/d/1iCrztgK6xc9MGAX9riTK6othdrFZoBjp",
                  aspectRatio: "12:2",
                  aspectMode: "cover",
                },
              ],
              justifyContent: "flex-end",
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text: "แจ้งเตือน",
                          size: "xxs",
                        },
                        {
                          type: "text",
                          text: "รายการเงินเข้า",
                          size: "sm",
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          // <-------------------- [data] amount -------------------->
                          text: `+${formattedAmount} บาท`,
                          offsetTop: "10px",
                          align: "end",
                          weight: "bold",
                          size: "lg",
                          color: "#06C755",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "separator",
                  margin: "5px",
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",
                          text: "จากบัญชี",
                          flex: 0,
                          size: "sm",
                        },
                        {
                          type: "text",
                          // <-------------------- [data] ชื่อจริง + เลขบัญชี -------------------->
                          text: `${fullnameWithBankNumber}`,
                          align: "end",
                          size: "sm",
                          offsetTop: "4px",
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "image",
                          // <-------------------- [data] imageUrl ธนาคารที่โอนมา -------------------->
                          url: "https://lh3.googleusercontent.com/d/1L516HGgJAkdyXcZsP24wmt8yU3oB09Q6",
                          size: "18px",
                          align: "end",
                          offsetEnd: "5px",
                          offsetTop: "2px",
                        },
                        {
                          type: "text",
                          // <-------------------- [data] ชื่อธนาคาร : กสิกรไทย -------------------->
                          text: "กสิกรไทย",
                          align: "end",
                          size: "sm",
                          flex: 0,
                          offsetBottom: "2px",
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",

                          text: "เข้า 1 Wallet ID",
                          flex: 0,
                          size: "sm",
                        },
                        {
                          type: "text",
                          // <-------------------- [data] walletUniqueId -------------------->
                          text: `${walletUniqueId}`,
                          align: "end",
                          size: "sm",
                          offsetTop: "3px",
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",
                          text: "วันที่/เวลา",
                          flex: 0,
                          size: "sm",
                        },
                        {
                          type: "text",
                          // <-------------------- [data] วันเวลาที่อัพเดท: 20 ส.ค. 68 15:36 -------------------->
                          text: `${date}`,
                          align: "end",
                          size: "sm",
                        },
                      ],
                    },
                  ],
                  offsetTop: "5px",
                },
                {
                  type: "separator",
                  margin: "10px",
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",
                          text: "ยอดเงินคงเหลือ",
                          flex: 0,
                          size: "sm",
                        },
                        {
                          type: "text",
                          // <-------------------- [data] balance: 0,000.00 บาท -------------------->
                          text: `${formattedBalance} บาท`,
                          align: "end",
                          size: "sm",
                          color: "#06C755",
                          weight: "bold",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "separator",
                  margin: "5px",
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "button",
                      action: {
                        type: "uri",
                        label: "ดูรายการเดินบัญชี",
                        // <-------------------- [data] LIFF_URL/history -------------------->
                        uri: `${LIFF_URL}/history`,
                      },
                      height: "sm",
                      style: "primary",
                    },
                  ],
                  offsetTop: "5px",
                },
                {
                  type: "separator",
                  margin: "10px",
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "image",
                      url: "https://lh3.googleusercontent.com/d/1dgN6-bAYGzwtLQ9nxSLBT_EGHQg0CeHi",
                      flex: 1,
                      gravity: "center",
                      size: "full",
                      animated: true,
                    },
                    {
                      type: "text",
                      text: "แจ้งปัญหาการใช้งาน",
                      flex: 12,
                      size: "xxs",
                      color: "#666666",
                      weight: "bold",
                      gravity: "center",
                      wrap: true,
                      offsetStart: "-5px",
                    },
                    {
                      type: "image",
                      url: "https://lh3.googleusercontent.com/d/1fCTeujQB4UlIxLHGhDJvQPtfDr3w0Z7F",
                      flex: 1,
                      gravity: "center",
                      size: "200%",
                    },
                  ],
                  spacing: "md",
                  // <-------------------- ปุ่มแจ้งปัญหาติดต่อเจ้าหน้า -------------------->
                  action: {
                    type: "message",
                    label: "ติดต่อเจ้าหน้าที่",
                    text: "ติดต่อเจ้าหน้าที่",
                  },
                  justifyContent: "center",
                  alignItems: "center",
                  offsetTop: "5px",
                },
              ],
              paddingAll: "12px",
            },
          },
        },
      ],
    };
  }

  if (mode === "withdraw") {
    const {
      amount,
      walletUniqueId,
      toDisplay,
      bankImageUrl,
      bankName,
      date,
      balance,
      liffHistoryUrl,
    } = payload;
    if (
      !amount ||
      !walletUniqueId ||
      !toDisplay ||
      !bankImageUrl ||
      !bankName ||
      !date ||
      !balance ||
      !liffHistoryUrl
    )
      throw new ApiError(httpStatus.BAD_REQUEST, "Failed flex message");

    return {
      // <-------------------- FLEX MESSAGE : ถอนเงิน -------------------->
      to: line_user_id,
      messages: [
        {
          type: "flex",
          altText: `📢 แจ้งเตือน 1 Wallet ถอนเงินสำเร็จ จำนวน ${amount} บาท 💵`,
          contents: {
            type: "bubble",
            size: "mega",
            hero: {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "image",
                  size: "100%",
                  animated: true,
                  url: "https://lh3.googleusercontent.com/d/1ED-x4qjaoCjMOHObufu-Y1rJqFQe2cQh",
                  aspectRatio: "12:2",
                  aspectMode: "cover",
                },
              ],
              justifyContent: "flex-end",
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text: "แจ้งเตือน",
                          size: "xxs",
                        },
                        {
                          type: "text",
                          text: "รายการโอน/ถอน",
                          size: "sm",
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          // <-------------------- [data] amount -------------------->
                          text: `-${amount} บาท`,
                          offsetTop: "10px",
                          align: "end",
                          weight: "bold",
                          size: "lg",
                          color: "#FF3131",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "separator",
                  margin: "5px",
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",
                          text: "จาก 1 Wallet ID",
                          flex: 0,
                          size: "sm",
                        },
                        {
                          type: "text",
                          // <-------------------- [data] walletUniqueId -------------------->
                          text: `${walletUniqueId}`,
                          align: "end",
                          size: "sm",
                          offsetTop: "4px",
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",
                          text: "ไปบัญชี",
                          flex: 0,
                          size: "sm",
                        },
                        {
                          // <-------------------- [data] ชื่อบัญชี + เลขบัญชี -------------------->
                          type: "text",
                          text: `${toDisplay}`,
                          align: "end",
                          size: "sm",
                          offsetTop: "1px",
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "image",
                          // <-------------------- [data] imageUrl ธนาคาร -------------------->
                          url: `${bankImageUrl}`,
                          size: "18px",
                          align: "end",
                          offsetEnd: "5px",
                          offsetTop: "2px",
                        },
                        {
                          type: "text",
                          // <-------------------- [data] ชื่อธนาคาร: กสิกรไทย -------------------->
                          text: `${bankName}`,
                          align: "end",
                          size: "sm",
                          offsetBottom: "2px",
                          flex: 0,
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",
                          text: "วันที่/เวลา",
                          flex: 0,
                          size: "sm",
                        },
                        {
                          type: "text",
                          // <-------------------- [data] วันเวลาที่อัพเดท: 20 ส.ค. 68 15:36 -------------------->
                          text: `${date}`,
                          align: "end",
                          size: "sm",
                          offsetTop: "2px",
                        },
                      ],
                    },
                  ],
                  offsetTop: "5px",
                },
                {
                  type: "separator",
                  margin: "10px",
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "text",
                          text: "ยอดเงินคงเหลือ",
                          flex: 0,
                          size: "sm",
                        },
                        {
                          type: "text",
                          // <-------------------- [data] ยอดเงินคงเหลือ: 0.00 บาท -------------------->
                          text: `${balance} บาท`,
                          align: "end",
                          size: "sm",
                          color: "#FF3131",
                          weight: "bold",
                          offsetTop: "1px",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "separator",
                  margin: "5px",
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "button",
                      action: {
                        type: "uri",
                        // <-------------------- [data] LIFF_URL -------------------->
                        label: "ดูรายการเดินบัญชี",
                        uri: `${liffHistoryUrl}`,
                      },
                      height: "sm",
                      style: "primary",
                      color: "#FF3131",
                    },
                  ],
                  offsetTop: "5px",
                },
                {
                  type: "separator",
                  margin: "10px",
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "image",
                      url: "https://lh3.googleusercontent.com/d/1dgN6-bAYGzwtLQ9nxSLBT_EGHQg0CeHi",
                      flex: 1,
                      gravity: "center",
                      size: "full",
                      animated: true,
                    },
                    {
                      type: "text",
                      text: "แจ้งปัญหาการใช้งาน",
                      flex: 12,
                      size: "xxs",
                      color: "#666666",
                      weight: "bold",
                      gravity: "center",
                      wrap: true,
                      offsetStart: "-5px",
                    },
                    {
                      type: "image",
                      url: "https://lh3.googleusercontent.com/d/1fCTeujQB4UlIxLHGhDJvQPtfDr3w0Z7F",
                      flex: 1,
                      gravity: "center",
                      size: "200%",
                    },
                  ],
                  spacing: "md",
                  action: {
                    type: "message",
                    label: "ติดต่อเจ้าหน้าที่",
                    text: "ติดต่อเจ้าหน้าที่",
                  },
                  justifyContent: "center",
                  alignItems: "center",
                  offsetTop: "5px",
                },
              ],
              paddingAll: "12px",
            },
          },
        },
      ],
    };
  }

  return null;
};

export default {
  flexMessage,
};
