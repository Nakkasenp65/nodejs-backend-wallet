/**
 * @file กำหนดคลาสข้อผิดพลาดแบบกำหนดเอง (Custom Error Class) สำหรับใช้ในแอปพลิเคชัน
 * @description ไฟล์นี้สร้างคลาส `ApiError` ซึ่งขยายความสามารถจากคลาส `Error` พื้นฐานของ JavaScript
 * โดยเพิ่มคุณสมบัติที่สำคัญ เช่น `statusCode` และ `isOperational` เพื่อให้การจัดการข้อผิดพลาด
 * ทั่วทั้งแอปพลิเคชันมีความสอดคล้อง, เป็นระบบ, และสามารถคาดเดาได้
 * @module utils/ApiError
 */
class ApiError extends Error {
    statusCode: number;
    isOperational: boolean;

    /**
     * สร้าง instance ของ ApiError
     * @constructor
     * @param {number} statusCode - HTTP status code ที่สอดคล้องกับข้อผิดพลาด (เช่น 400, 404, 500)
     * @param {string} message - ข้อความอธิบายข้อผิดพลาดที่จะส่งกลับไปยัง Client
     * @param {boolean} [isOperational=true] - Flag เพื่อระบุว่าเป็นข้อผิดพลาดที่คาดการณ์ได้ (Operational Error) หรือไม่
     * @param {string} [stack=''] - (Optional) Stack trace ที่กำหนดเอง หากไม่ระบุจะถูกสร้างขึ้นโดยอัตโนมัติ
     */
    constructor(statusCode: number, message: string, isOperational = true, stack = "") {
        super(message);

        Object.setPrototypeOf(this, ApiError.prototype);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default ApiError;
