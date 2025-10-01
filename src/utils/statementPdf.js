import pdf from "html-pdf";
import path from "path";

// Helper functions (ฟังก์ชันช่วยเหลือ)
const formatDate = (date) =>
  new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
const formatDateTime = (date) =>
  new Date(date).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const formatCurrency = (amount) =>
  new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

/**
 * สร้าง SVG สำหรับลายน้ำแล้วแปลงเป็น Data URL
 */
function generateWatermarkDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">
      <text
        x="50%" y="50%"
        font-family="NotoSansThai, sans-serif" font-size="18"
        fill="#000" opacity="0.08"
        transform="rotate(-30, 100, 75)"
        text-anchor="middle" dominant-baseline="middle"
      >
        1 MONEY PLUS
      </text>
    </svg>
  `;
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * สร้างเนื้อหา HTML สำหรับใบแจ้งยอดบัญชี
 * @param {object} data - ข้อมูลธุรกรรมและ Wallet
 * @returns {string} - โค้ด HTML ที่สมบูรณ์
 */
function createHtmlContent(data) {
  const { transactions, wallet, currentWalletId, startDate, endDate } = data;
  const validTransactions = transactions.filter((tx) => tx.type !== "REWARD");

  const totalIncome = validTransactions.reduce(
    (sum, tx) => (tx.toWalletId === currentWalletId ? sum + tx.amount : sum),
    0,
  );
  const totalExpense = validTransactions.reduce(
    (sum, tx) => (tx.fromWalletId === currentWalletId ? sum + tx.amount : sum),
    0,
  );
  const openingBalance = wallet.balance - totalIncome + totalExpense;
  const watermarkDataUrl = generateWatermarkDataUrl();

  const transactionRowsHtml = validTransactions
    .map((tx) => {
      const isIncome = tx.toWalletId === currentWalletId;
      let description = "";
      switch (tx.type) {
        case "DEPOSIT":
          description = `ฝากเงิน (จาก: ${tx.from})`;
          break;
        case "TRANSFER":
          description = isIncome
            ? `รับโอน (จาก: ${tx.fromWallet?.user?.line_display_name})`
            : `โอนเงิน (ถึง: ${tx.toWallet?.user?.line_display_name})`;
          break;
        case "WITHDRAW":
          description = `ถอนเงิน (ไปที่: ${tx.to})`;
          break;
        default:
          description = tx.description || "";
      }
      return `<tr><td>${formatDateTime(tx.createdAt)}</td><td>${description}</td><td class="money credit">${isIncome ? formatCurrency(tx.amount) : "-"}</td><td class="money debit">${!isIncome ? formatCurrency(tx.amount) : "-"}</td></tr>`;
    })
    .join("");

  // โค้ด HTML ทั้งหมดจากไฟล์ตัวอย่างของคุณ (นำมาวางที่นี่)
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        :root { --brand-purple: #6f42c1; }
        @font-face {
          font-family: 'NotoSansThai';
          src: url('file://${path.resolve("public/fonts/NotoSansThai-Regular.ttf")}') format('truetype');
          font-weight: 400;
        }
        body {
          font-family: 'NotoSansThai', sans-serif;
          font-size: 10px;
          color: #333;
          position: relative;
        }
        body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: -1;
            background-image: url('${watermarkDataUrl}');
            background-repeat: repeat;
        }
        .container { padding: 20px; }
        .header, .info-summary {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 20px;
        }
        .info-summary {
          padding-top: 20px;
          border-top: 1px solid #eee;
          border-bottom: 1px solid #eee;
        }
        .summary-box table { width: 280px; }
        .summary-box td { padding: 2px 0; }
        h1 { font-size: 20px; color: var(--brand-purple); margin: 0; }
        h2 { font-size: 18px; color: var(--brand-purple); margin: 0; }
        table.transactions { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border-bottom: 1px solid #eee; padding: 8px; text-align: left; }
        th { background-color: #f8f8f8; font-weight: bold; color: var(--brand-purple); }
        .money { text-align: right; }
        .credit { color: #008000; }
        .debit { color: #D32F2F; }
        .text-right { text-align: right; }
      </style>
    </head>
    <body>
        <div class="container">
            <header class="header">
                <div>
                    <h1>NUMBER 1 MONEY PLUS</h1>
                    <p>123 ถนนเทคโนโลยี แขวงนวัตกรรม เขตดิจิทัล กรุงเทพฯ 10110</p>
                </div>
                <div class="text-right">
                    <h2>ใบแจ้งยอดบัญชี</h2>
                    <p>เลขที่: STMT-${new Date().getFullYear()}-${wallet.walletUniqueId.slice(-4)}<br>
                    วันที่ออก: ${formatDate(new Date())}</p>
                </div>
            </header>
            <section class="info-summary">
                <div>
                    <b>สรุปรายการสำหรับ:</b>
                    <p>ชื่อ: ${wallet.user.fullname}<br>
                    เลขที่ Wallet: ${wallet.walletUniqueId}<br>
                    ช่วงเวลา: ${formatDate(startDate)} - ${formatDate(endDate)}</p>
                </div>
                <div class="summary-box">
                    <table>
                        <tr><td>ยอดคงเหลือยกมา:</td><td class="text-right">${formatCurrency(openingBalance)}</td></tr>
                        <tr><td>รายรับทั้งหมด:</td><td class="text-right">${formatCurrency(totalIncome)}</td></tr>
                        <tr><td>รายจ่ายทั้งหมด:</td><td class="text-right">${formatCurrency(totalExpense)}</td></tr>
                        <tr><td><b>ยอดคงเหลือสุทธิ:</b></td><td class="text-right"><b>${formatCurrency(wallet.balance)}</b></td></tr>
                    </table>
                </div>
            </section>
            <main>
              <h3>รายการเคลื่อนไหวบัญชี</h3>
              <table class="transactions">
                  <thead>
                      <tr>
                          <th>วัน-เวลา</th>
                          <th>รายละเอียด</th>
                          <th class="money">รายรับ (บาท)</th>
                          <th class="money">รายจ่าย (บาท)</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${transactionRowsHtml}
                  </tbody>
              </table>
            </main>
        </div>
    </body>
    </html>
  `;
}

/**
 * สร้าง PDF จากข้อมูลธุรกรรมและส่งกลับเป็น Buffer
 * @param {object} data - ข้อมูลธุรกรรมที่ดึงมาจากฐานข้อมูล
 * @returns {Promise<Buffer>} - Buffer ของไฟล์ PDF
 */
const buildStatementPdf = (data) => {
  return new Promise((resolve, reject) => {
    const html = createHtmlContent(data);
    const options = {
      format: "A4",
      orientation: "portrait",
      border: { top: "1.5cm", right: "1.5cm", bottom: "1.5cm", left: "1.5cm" },
      footer: {
        height: "20mm",
        contents: {
          default:
            '<div style="font-family: NotoSansThai, sans-serif; font-size: 8px; text-align: center; color: #888;">หน้า {{page}}/{{pages}}<br>ขอขอบคุณที่ใช้บริการ NUMBER 1 MONEY PLUS</div>',
        },
      },
    };

    pdf.create(html, options).toBuffer((err, buffer) => {
      if (err) return reject(err);
      resolve(buffer);
    });
  });
};

export default buildStatementPdf;
