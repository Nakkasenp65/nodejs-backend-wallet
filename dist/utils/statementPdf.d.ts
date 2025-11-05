export default buildStatementPdf;
/**
 * สร้าง PDF จากข้อมูลธุรกรรมและส่งกลับเป็น Buffer
 * @param {object} data - ข้อมูลธุรกรรมที่ดึงมาจากฐานข้อมูล
 * @returns {Promise<Buffer>} - Buffer ของไฟล์ PDF
 */
declare function buildStatementPdf(data: object): Promise<Buffer>;
//# sourceMappingURL=statementPdf.d.ts.map