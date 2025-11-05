/**
 * @file Utility Module สำหรับการสื่อสารกับ LINE Messaging API
 * @description ไฟล์นี้ทำหน้าที่เป็น Abstraction Layer หรือตัวกลางในการซ่อนความซับซ้อนของการตั้งค่า
 * และการส่ง HTTP Request ไปยัง LINE API โดยเฉพาะ ทำให้การส่งข้อความจากส่วนต่างๆ ของแอปพลิเคชัน
 * สามารถทำได้ผ่านการเรียกใช้ฟังก์ชันเดียวที่เป็นมาตรฐาน
 * @module utils/axios
 * @requires axios - HTTP client สำหรับการยิง API request
 */
import axios from "axios";
/**
 * ส่ง Push Message ไปยังผู้ใช้ผ่าน LINE Messaging API
 * @description ฟังก์ชันนี้จะอ่าน Channel Access Token จาก Environment Variables,
 * สร้าง Authorization Header ที่ถูกต้อง, และส่ง HTTP POST request ไปยัง
 * `https://api.line.me/v2/bot/message/push` พร้อมกับ Payload ที่ได้รับมา
 * **ข้อควรระวัง:** ฟังก์ชันนี้ถูกออกแบบมาให้ดักจับข้อผิดพลาด (catch error) และบันทึก Log
 * แต่จะไม่โยน Error ต่อ (re-throw) เพื่อป้องกันไม่ให้ Flow การทำงานหลักของผู้ใช้ล้มเหลว
 * @async
 * @param {object} flexMessage - อ็อบเจกต์ Payload ที่สมบูรณ์ซึ่งสอดคล้องกับรูปแบบของ LINE Messaging API's push message format
 * @returns {Promise<object|undefined>} Promise ที่จะ resolve เป็นอ็อบเจกต์ `data` จากการตอบกลับของ LINE API หากสำเร็จ,
 * หรือ `undefined` หากเกิดข้อผิดพลาด (Error จะถูกบันทึกใน Console เท่านั้น)
 */
export const pushMessage = async (flexMessage) => {
    try {
        const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;
        const config = {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${channelAccessToken}`,
            },
        };
        const { data } = await axios.post("https://api.line.me/v2/bot/message/push", flexMessage, config);
        return data;
    }
    catch (error) {
        console.error("[SEND_LINE_FAIL] - ", error.response.data);
    }
};
export default {
    pushMessage,
};
//# sourceMappingURL=axios.js.map