import pdf from "html-pdf";
import fs from "fs";
import path from "path";

// ... (ส่วน MOCK DATA เหมือนเดิมทุกประการ) ...
const mockStatementData = {
  currentWalletId: "68c7c9773f653899b97dceef",
  startDate: new Date("2025-09-01T00:00:00.000Z"),
  endDate: new Date("2025-09-30T23:59:59.000Z"),
  wallet: {
    id: "68c7c9773f653899b97dceef",
    balance: 15470.5,
    walletUniqueId: "1WL-A1B2C3",
    user: { fullname: "สมชาย ใจดี" },
  },
  transactions: [
    {
      id: "txn_001",
      type: "DEPOSIT",
      amount: 5000.0,
      from: "ธนาคารกสิกรไทย",
      toWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-02T10:00:00Z"),
    },
    {
      id: "txn_002",
      type: "WITHDRAW",
      amount: 1200.0,
      to: "ธนาคารไทยพาณิย์",
      fromWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-03T11:30:00Z"),
    },
    {
      id: "txn_003",
      type: "TRANSFER",
      amount: 350.0,
      toWallet: { user: { line_display_name: "ร้านกาแฟ" } },
      fromWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-03T15:00:00Z"),
    },
    {
      id: "txn_004",
      type: "DEPOSIT",
      amount: 10000.0,
      from: "เงินเดือนเข้า",
      toWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-05T09:00:00Z"),
    },
    {
      id: "txn_005",
      type: "WITHDRAW",
      amount: 5000.0,
      to: "จ่ายค่าเช่า",
      fromWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-05T18:00:00Z"),
    },
    {
      id: "txn_006",
      type: "TRANSFER",
      amount: 850.0,
      toWallet: { user: { line_display_name: "คุณแม่" } },
      fromWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-07T12:00:00Z"),
    },
    {
      id: "txn_007",
      type: "TRANSFER",
      amount: 250.5,
      fromWallet: { user: { line_display_name: "คุณสมปอง" } },
      toWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-10T20:15:00Z"),
    },
    {
      id: "txn_008",
      type: "WITHDRAW",
      amount: 400.0,
      to: "ซื้อของ",
      fromWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-11T19:00:00Z"),
    },
    {
      id: "txn_009",
      type: "DEPOSIT",
      amount: 3000.0,
      from: "งานฟรีแลนซ์",
      toWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-15T14:00:00Z"),
    },
    {
      id: "txn_010",
      type: "WITHDRAW",
      amount: 1500.0,
      to: "ค่าบัตรเครดิต",
      fromWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-18T10:00:00Z"),
    },
    {
      id: "txn_011",
      type: "TRANSFER",
      amount: 99.0,
      toWallet: { user: { line_display_name: "ค่าอาหาร" } },
      fromWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-20T12:30:00Z"),
    },
    {
      id: "txn_012",
      type: "DEPOSIT",
      amount: 500.0,
      from: "เพื่อนคืนเงิน",
      toWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-22T17:00:00Z"),
    },
    {
      id: "txn_013",
      type: "WITHDRAW",
      amount: 2000.0,
      to: "ชำระบิล",
      fromWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-25T11:00:00Z"),
    },
    {
      id: "txn_014",
      type: "TRANSFER",
      amount: 600.0,
      toWallet: { user: { line_display_name: "ช้อปปิ้งออนไลน์" } },
      fromWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-27T21:00:00Z"),
    },
    {
      id: "txn_015",
      type: "DEPOSIT",
      amount: 10000.0,
      from: "โบนัส",
      toWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-28T16:00:00Z"),
    },
    {
      id: "txn_016",
      type: "WITHDRAW",
      amount: 2500.0,
      to: "ลงทุน",
      fromWalletId: "68c7c9773f653899b97dceef",
      createdAt: new Date("2025-09-29T09:30:00Z"),
    },
  ],
};

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
 * ⭐️⭐️⭐️ จุดที่แก้ไข ⭐️⭐️⭐️
 * ปรับแก้ SVG ของลายน้ำ
 */
function generateWatermarkDataUrl() {
  // 1. ลดขนาด SVG (width, height) เพื่อให้ลายน้ำถี่ขึ้น
  // 2. เปลี่ยนข้อความเป็น "1 MONEY PLUS"
  // 3. ปรับตำแหน่งการหมุน (transform) ให้เข้ากับขนาดใหม่
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">
      <text
        x="50%"
        y="50%"
        font-family="NotoSansThai, sans-serif"
        font-size="18"
        fill="#000"
        opacity="0.08"
        transform="rotate(-30, 100, 75)"
        text-anchor="middle"
        dominant-baseline="middle"
      >
        1 MONEY PLUS
      </text>
    </svg>
  `;
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

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
  const watermarkDataUrl = generateWatermarkDataUrl(); // ไม่ต้องส่งค่า text เข้าไปแล้ว

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
        @font-face {
          font-family: 'NotoSansThai';
          src: url('file://${path.resolve("public/fonts/NotoSansThai-Bold.ttf")}') format('truetype');
          font-weight: 700;
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
        h1, h2 { 
            margin: 0;
            color: var(--brand-purple);
        }
        h1 { font-size: 20px; }
        h2 { font-size: 18px; }
        h3 { font-size: 14px; }
        table.transactions {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border-bottom: 1px solid #eee;
          padding: 8px;
          text-align: left;
        }
        th { 
            background-color: #f8f8f8; 
            font-weight: bold;
            color: var(--brand-purple);
        }
        tr:nth-child(even) { background-color: #fcfcfc; }
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
                    <p>เลขที่: STMT-${new Date().getFullYear()}-00123<br>
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

function buildPdfToFile(html, outputPath) {
  return new Promise((resolve, reject) => {
    const options = {
      format: "A4",
      orientation: "portrait",
      border: { top: "1.5cm", right: "1.5cm", bottom: "1.5cm", left: "1.5cm" },
      footer: {
        height: "20mm",
        contents: {
          default:
            '<div style="font-family: NotoSansThai, sans-serif; font-size: 8px; text-align: center; color: #888;"><span>{{page}}</span>/<span>{{pages}}</span><br>ขอขอบคุณที่ใช้บริการ NUMBER 1 MONEY PLUS</div>',
        },
      },
    };

    pdf.create(html, options).toFile(outputPath, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

// ===================================================================================
//  🚀 3. SCRIPT EXECUTION
// ===================================================================================
async function main() {
  const PDF_FILE_PATH = "./professional_statement_html.pdf";
  console.log("🎨 กำลังสร้าง HTML content...");
  const htmlContent = createHtmlContent(mockStatementData);
  console.log("📄 กำลังแปลง HTML เป็น PDF (ปรับลายน้ำ)...");
  try {
    await buildPdfToFile(htmlContent, PDF_FILE_PATH);
    console.log("✅ สร้างไฟล์ PDF สำเร็จแล้ว!");
    console.log(`📂 ไฟล์ถูกบันทึกไว้ที่: ${PDF_FILE_PATH}`);
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดระหว่างการสร้าง PDF:", error);
  }
}

main();
