import PDFDocument from "pdfkit";
import path from "path";

const COLOR_PRIMARY = "#7C3AED";
const COLOR_LIGHT_PURPLE = "#F5F3FF";
const COLOR_TEXT_HEADER = "#FFFFFF";
const COLOR_TEXT_BODY = "#1F2937";
const COLOR_TEXT_MUTED = "#6B7280";
const PAGE_MARGIN = 50;

// --- PDF Generation Logic ---
export default async function buildTransactionsPdf({
  wallet,
  currentWalletId,
  transactions,
  startDate,
  endDate,
}) {
  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });

  const chunks = [];
  const streamDone = new Promise((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve());
    doc.on("error", reject);
  });

  const fontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    "NotoSansThai-Regular.ttf",
  );
  doc.registerFont("thai", fontPath);
  doc.font("thai");

  // --- Document Sections ---
  drawHeader(doc, { wallet, startDate, endDate });

  const tableTop = 190;
  doc.y = tableTop;

  const tableCols = [
    { key: "date", label: "วันที่", width: 90 },
    { key: "details", label: "รายละเอียด", width: 185 },
    { key: "type", label: "ประเภท", width: 70 },
    { key: "amount", label: "จำนวนเงิน", width: 150, align: "right" },
  ];

  drawTableHeader(doc, tableCols);

  if (!transactions.length) {
    drawEmptyState(doc);
  } else {
    let runningBalance = wallet.balance;
    transactions.forEach((t) =>
      drawTxnRow(doc, t, tableCols, currentWalletId, runningBalance),
    );
  }

  drawFooter(doc, transactions, currentWalletId);

  doc.end();
  await streamDone;
  return Buffer.concat(chunks);
}

function drawHeader(doc, { wallet, startDate, endDate }) {
  doc.rect(0, 0, doc.page.width, 120).fill(COLOR_PRIMARY);
  doc
    .fontSize(22)
    .fillColor(COLOR_TEXT_HEADER)
    .text("รายการเดินบัญชี", PAGE_MARGIN, 45);
  doc.fontSize(14).text("(Statement)", { continued: false });

  doc.y = 140;
  doc.fontSize(10).fillColor(COLOR_TEXT_BODY);
  const owner =
    wallet?.user?.fullname ??
    wallet?.user?.line_display_name ??
    `User ${wallet?.userId ?? ""}`;
  doc.text(`กระเป๋า: ${wallet.id}`, PAGE_MARGIN, doc.y);
  doc.text(`ชื่อผู้ใช้: ${owner}`, { align: "right" });

  const dateText =
    startDate || endDate
      ? `ช่วงเวลา: ${new Date(startDate).toLocaleDateString("th-TH")} ถึง ${new Date(endDate).toLocaleDateString("th-TH")}`
      : "ช่วงเวลา: ทั้งหมด";
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor(COLOR_TEXT_MUTED).text(dateText);
}

function drawTableHeader(doc, cols) {
  const y = doc.y;
  let x = PAGE_MARGIN;
  const cellPadding = 5;

  doc.rect(x, y, doc.page.width - PAGE_MARGIN * 2, 25).fill(COLOR_LIGHT_PURPLE);
  doc.fillColor(COLOR_TEXT_BODY).fontSize(10);

  cols.forEach((col) => {
    doc.text(col.label, x + cellPadding, y + 8, {
      width: col.width - cellPadding * 2,
      align: col.align || "left",
    });
    x += col.width;
  });

  doc.y += 25;
}

function drawTxnRow(doc, txn, cols, currentWalletId, runningBalance) {
  const rowY = doc.y;
  let cellX = PAGE_MARGIN;
  const rowHeight = 35;
  const cellPadding = 5;
  let details = txn.name || txn.description || "-";
  let amount = txn.amount ?? 0;
  let amountText = fmtTHB(amount);
  let amountColor = COLOR_TEXT_BODY;

  if (txn.toWalletId === currentWalletId) {
    // นี่คือ "เงินเข้า"
    amountText = `+${fmtTHB(amount)}`;
    amountColor = "#16A34A"; // Green
    if (txn.fromWallet) {
      details = `รับจาก: ${txn.fromWallet.user.line_display_name}`;
    } else {
      details = txn.externalSource || "รายรับเข้า";
    }
  } else if (txn.fromWalletId === currentWalletId) {
    // นี่คือ "เงินออก"
    amountText = `-${fmtTHB(amount)}`;
    amountColor = "#DC2626"; // Red
    if (txn.toWallet) {
      details = `โอนไป: ${txn.toWallet.user.line_display_name}`;
    } else {
      details = txn.externalDestination || "รายจ่ายออก";
    }
  }

  doc
    .moveTo(PAGE_MARGIN, rowY + rowHeight)
    .lineTo(doc.page.width - PAGE_MARGIN, rowY + rowHeight)
    .lineWidth(0.5)
    .strokeColor("#E5E7EB")
    .stroke();

  const date = new Date(txn.createdAt).toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // **CHANGE: Use the translateTerm function to convert data to Thai.**
  const rowData = {
    date,
    details: details,
    type: translateTerm(txn.type),
    amount: amountText,
  };

  doc.fillColor(COLOR_TEXT_BODY).fontSize(9);

  cols.forEach((col) => {
    if (col.key === "amount") doc.fillColor(amountColor);

    doc.text(rowData[col.key], cellX + cellPadding, rowY + 12, {
      width: col.width - cellPadding * 2,
      align: col.align || "left",
    });

    if (col.key === "amount") doc.fillColor(COLOR_TEXT_BODY);
    cellX += col.width;
  });

  doc.y = rowY + rowHeight;
}

function drawFooter(doc, transactions, currentWalletId) {
  const totalIn = sum(
    transactions
      .filter((t) => t.toWalletId === currentWalletId)
      .map((t) => t.amount),
  );

  const totalOut = sum(
    transactions
      .filter((t) => t.fromWalletId === currentWalletId)
      .map((t) => t.amount),
  );

  const net = totalIn - totalOut;

  let y = doc.page.height - 150;
  if (doc.y > y) {
    doc.addPage();
    y = PAGE_MARGIN;
  }
  doc.y = y;

  const summaryBoxWidth = 300;
  const summaryBoxX = doc.page.width - PAGE_MARGIN - summaryBoxWidth;

  doc.fontSize(11).fillColor(COLOR_TEXT_BODY);
  doc.text("รวมเงินเข้า:", summaryBoxX, doc.y, {
    width: summaryBoxWidth,
    align: "left",
  });
  doc.text(fmtTHB(totalIn), summaryBoxX, doc.y, {
    width: summaryBoxWidth,
    align: "right",
  });
  doc.moveDown(0.75);

  doc.text("รวมเงินออก:", summaryBoxX, doc.y, {
    width: summaryBoxWidth,
    align: "left",
  });
  doc.text(fmtTHB(totalOut), summaryBoxX, doc.y, {
    width: summaryBoxWidth,
    align: "right",
  });
  doc.moveDown(0.5);

  doc
    .moveTo(summaryBoxX, doc.y)
    .lineTo(summaryBoxX + summaryBoxWidth, doc.y)
    .lineWidth(1)
    .strokeColor(COLOR_TEXT_BODY)
    .stroke();
  doc.moveDown(0.5);

  doc.fontSize(12);
  doc.text("สุทธิ:", summaryBoxX, doc.y, {
    width: summaryBoxWidth,
    align: "left",
  });
  doc.text(fmtTHB(net), summaryBoxX, doc.y, {
    width: summaryBoxWidth,
    align: "right",
  });
}

function drawEmptyState(doc) {
  doc
    .fontSize(11)
    .fillColor(COLOR_TEXT_MUTED)
    .text("ไม่มีรายการที่จะแสดง", PAGE_MARGIN, doc.y + 20, {
      align: "center",
      width: doc.page.width - PAGE_MARGIN * 2,
    });
}

function sum(arr) {
  return arr.reduce((a, b) => a + (Number(b) || 0), 0);
}

/* ---------------- PDF builder ---------------- */

// --- Theme and Layout Constants ---

// --- Formatting and Translation Helpers ---
function fmtDate(d) {
  if (!d) return "";
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

function fmtTHB(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  });
}

/**
 * Translates specific transaction terms into Thai.
 * @param {string} term The term to translate (e.g., 'SUCCESS', 'INCOME').
 * @returns {string} The translated Thai term or the original term if no translation exists.
 */
function translateTerm(term) {
  switch (term) {
    case "SUCCESS":
      return "สำเร็จ";
    case "INCOME":
      return "รายรับ";
    case "OUTCOME":
      return "รายจ่าย";
    case "DEPOSIT":
      return "ฝากเงิน";
    case "WITHDRAW":
      return "ถอนเงิน";
    case "REWARD":
      return "รางวัล";
    default:
      return term;
  }
}
