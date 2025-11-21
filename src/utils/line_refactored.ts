import ApiError from "./ApiError.js";
import httpStatus from "http-status";

const LIFF_URL = process.env.LIFF_URL;

/**
 * Send registration success flex message
 */
export const sendRegisterFlexMessage = (line_user_id: string, payload: any) => {
    if (!LIFF_URL) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "LIFF URL is not defined");
    
    const { walletUniqueId, fullname, phone, balance } = payload;
    console.log({ walletUniqueId, fullname, phone, balance });
    
    if (!walletUniqueId || !fullname || !phone || !balance)
        throw new ApiError(httpStatus.BAD_REQUEST, "Flex message content failed");
    
    return {
        to: line_user_id,
        messages: [
            {
                type: "flex",
                altText: `📢 แจ้งเตือน เปิด 1 Wallet สำเร็จ Wallet Id: ...`,
                contents: {
