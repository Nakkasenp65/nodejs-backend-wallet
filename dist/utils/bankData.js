export const BANK_DATA = [
    {
        name_th: "ธนาคารกรุงเทพ",
        short_name_en: "BBL",
        logo_url: "https://lh3.googleusercontent.com/d/1kvJOSuB70etFoHp14C8vvO7ZGeeYLbL4",
    },
    {
        name_th: "ธนาคารกสิกรไทย",
        short_name_en: "KBank",
        logo_url: "https://lh3.googleusercontent.com/d/1fHHAJhVwsAsMaoVcTv8pJhxYGJbDrz0Z",
    },
    {
        name_th: "ธนาคารกรุงไทย",
        short_name_en: "KTB",
        logo_url: "https://lh3.googleusercontent.com/d/1a9Zb5iggbFIyjgPz0DV9uBY0HfRgvy7R",
    },
    {
        name_th: "ธนาคารทหารไทยธนชาต",
        short_name_en: "ttb",
        logo_url: "https://lh3.googleusercontent.com/d/1KVeEmkjdEcmisA_t5yQMleiH7fsntMec",
    },
    {
        name_th: "ธนาคารไทยพาณิชย์",
        short_name_en: "SCB",
        logo_url: "https://lh3.googleusercontent.com/d/1nWr51gJ5F-XZ6dlQ6eFbqF5GIe1af7c5",
    },
    {
        name_th: "ธนาคารกรุงศรีอยุธยา",
        short_name_en: "Krungsri",
        logo_url: "https://lh3.googleusercontent.com/d/1AiQAHglWScRxFrnT61H_wxSs2K5dt2oU",
    },
    {
        name_th: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร",
        short_name_en: "BAAC",
        logo_url: "https://lh3.googleusercontent.com/d/1SDEDSm2b2J8cLuBHsovnL5bJwMp6BQoc",
    },
    {
        name_th: "ธนาคารออมสิน",
        short_name_en: "GSB",
        logo_url: "https://lh3.googleusercontent.com/d/1PV1A-Zgvcyz7Anj4qyZlSEVESqfOeLcV",
    },
    {
        name_th: "ธนาคารอาคารสงเคราะห์",
        short_name_en: "GH Bank",
        logo_url: "https://lh3.googleusercontent.com/d/1h438AWBIkci8wAi24IGIc3slNG9-qIY3",
    },
];
export const getBankLogoUrl = (bankName) => {
    // --- STAGE 1: การตรวจสอบความสมบูรณ์ของโครงสร้าง (Structural Integrity Check) ---
    // เกราะป้องกัน: ปฏิเสธข้อมูลนำเข้าที่ไม่ถูกต้อง (null, undefined, etc.) ทันที
    if (!bankName || typeof bankName !== "string") {
        console.warn(`[getBankLogoUrl] Invalid input provided: ${bankName}.`);
        return null;
    }
    // --- STAGE 2: การสืบค้นข้อมูล (Data Retrieval) ---
    // ใช้ Array.prototype.find() ซึ่งเป็นเครื่องมือที่แม่นยำและมีประสิทธิภาพที่สุด
    // สำหรับการค้นหา object แรกที่ตรงตามเงื่อนไข
    const foundBank = BANK_DATA.find((bank) => bank.name_th.trim() === bankName.trim());
    // --- STAGE 3: การวิเคราะห์ผลลัพธ์ (Result Analysis) ---
    // หาก foundBank มีค่า (truthy) แสดงว่าเราพบข้อมูลที่ตรงกัน
    if (foundBank) {
        return foundBank.logo_url;
    }
    // --- STAGE 4: กลไกป้องกันความล้มเหลว (Fail-Safe Mechanism) ---
    // หากไม่พบข้อมูล ให้คืนค่า null อย่างชัดเจน เพื่อให้โค้ดที่เรียกใช้
    // สามารถจัดการกับกรณีนี้ได้อย่างสง่างาม
    console.warn(`[getBankLogoUrl] No logo found for bank: "${bankName}".`);
    return null;
};
//# sourceMappingURL=bankData.js.map