import PDFDocument from "pdfkit-table";
import * as QRCode from "qrcode";
import * as path from "path";
import * as fs from "fs";

// Helper functions
const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
const formatDateTime = (date: Date | string) =>
    new Date(date).toLocaleString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

interface Transaction {
    type: string;
    toWalletId: string;
    fromWalletId: string;
    amount: number;
    from: string;
    to: string;
    description?: string;
    createdAt: Date | string;
    fromWallet?: { user?: { line_display_name?: string } };
    toWallet?: { user?: { line_display_name?: string } };
}

interface Wallet {
    walletUniqueId: string;
    balance: number;
    user: { fullname: string };
}

interface StatementData {
    transactions: Transaction[];
    wallet: Wallet;
    currentWalletId: string;
    startDate: Date | string;
    endDate: Date | string;
}

// --- Layout Configuration (Your Perfect Values) ---
export const LAYOUT = {
    qrBox: { x: 45, y: 138, w: 83, h: 83 },
    userInfoBox: { x: 52, y: 239, w: 239 },
    summaryBox: { x: 309, y: 239, w: 230 },
    tableStart: { x: 48, y: 360 }, 
    columnWidths: [73, 165, 75, 77, 80], 
};

/**
 * สร้าง PDF จากข้อมูลธุรกรรมและส่งกลับเป็น Buffer
 */
const buildStatementPdf = async (data: StatementData): Promise<Buffer> => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc: any = new (PDFDocument as any)({
                size: "A4",
                margin: 0,
                autoFirstPage: false,
            });

            const buffers: Buffer[] = [];
            doc.on("data", (chunk: any) => buffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            doc.on("error", (err: any) => reject(err));

            // 1. Prepare Paths & Assets
            const bgPath = path.resolve("public/statement.png");
            const fontPath = path.resolve("public/fonts/LINESeedSansTH_Bd.ttf");
            
            let bgBuffer: Buffer | null = null;
            if (fs.existsSync(bgPath)) {
                bgBuffer = fs.readFileSync(bgPath);
            } else {
                console.error("Statement background image not found at:", bgPath);
            }

            // Register font
            if (fs.existsSync(fontPath)) {
                doc.registerFont("LINESeedSansTH", fontPath);
                doc.font("LINESeedSansTH");
            }

            // 2. Add Background Logic
            doc.on("pageAdded", () => {
                if (bgBuffer) {
                    doc.image(bgBuffer, 0, 0, { width: doc.page.width, height: doc.page.height });
                }
            });

            // 3. Create First Page
            doc.addPage();

            // --- QR Code ---
            try {
                const qrDataUrl = await QRCode.toDataURL(data.wallet.walletUniqueId, { margin: 0 });
                doc.image(qrDataUrl, LAYOUT.qrBox.x + 5, LAYOUT.qrBox.y + 5, { 
                    width: LAYOUT.qrBox.w - 10, 
                    height: LAYOUT.qrBox.h - 10,
                });
            } catch (err: any) {
                console.error("Error generating QR code:", err);
            }

            // --- User Information ---
            const userX = LAYOUT.userInfoBox.x;
            const userY = LAYOUT.userInfoBox.y;
            
            doc.fillColor("#000000").fontSize(9);
            doc.text(`ชื่อ wallet: ${data.wallet.user.fullname}`, userX, userY);
            doc.text(`Wallet ID: ${data.wallet.walletUniqueId}`, userX, userY + 20);
            doc.text(`ช่วงเวลา: ${formatDate(data.startDate)} - ${formatDate(data.endDate)}`, userX, userY + 36);

            // --- Calculate Totals ---
            const validTransactions = data.transactions.filter((tx) => tx.type !== "REWARD");
            const totalIncome = validTransactions.reduce(
                (sum, tx) => (tx.toWalletId === data.currentWalletId ? sum + tx.amount : sum), 0,
            );
            const totalExpense = validTransactions.reduce(
                (sum, tx) => (tx.fromWalletId === data.currentWalletId ? sum + tx.amount : sum), 0,
            );
            
            // --- Summary Box (Simulating Justify-Between) ---
            const summaryX = LAYOUT.summaryBox.x;
            let summaryY = LAYOUT.summaryBox.y;
            const summaryWidth = LAYOUT.summaryBox.w;
            const lineHeight = 16; 

            doc.fillColor("#000000").fontSize(9);

            // Row 1: Income
            doc.text("รายรับรวม:", summaryX, summaryY);
            // Align Value to RIGHT
            doc.text(`${formatCurrency(totalIncome)}.-`, summaryX, summaryY, { align: 'right', width: summaryWidth });
            
            // Row 2: Expense
            summaryY += lineHeight;
            doc.text("รายจ่ายรวม:", summaryX, summaryY);
            doc.text(`${formatCurrency(totalExpense)}.-`, summaryX, summaryY, { align: 'right', width: summaryWidth });

            // Row 3: Net Balance
            summaryY += lineHeight;
            doc.text("ยอดคงเหลือสุทธิ:", summaryX, summaryY);
            doc.text(`${formatCurrency(data.wallet.balance)}.-`, summaryX, summaryY, { align: 'right', width: summaryWidth });


            // --- Table ---
            let balanceTracker = data.wallet.balance;
            
            const tableRows = validTransactions.map((tx) => {
                const isIncome = tx.toWalletId === data.currentWalletId;
                const amount = tx.amount;
                const balanceAfterTx = balanceTracker;
                
                if (isIncome) balanceTracker -= amount; 
                else balanceTracker += amount;

                let description = "";
                switch (tx.type) {
                    case "DEPOSIT": description = `ฝากเงิน (${tx.from})`; break;
                    case "TRANSFER":
                        description = isIncome
                            ? `รับโอน (${tx.fromWallet?.user?.line_display_name || "Unknown"})`
                            : `โอนเงิน (${tx.toWallet?.user?.line_display_name || "Unknown"})`;
                        break;
                    case "WITHDRAW": description = `ถอนเงิน (${tx.to})`; break;
                    default: description = tx.description || tx.type;
                }

                return [
                    formatDateTime(tx.createdAt),
                    description,
                    isIncome ? formatCurrency(amount) : "-",
                    !isIncome ? formatCurrency(amount) : "-",
                    formatCurrency(balanceAfterTx)
                ];
            });

            const table = {
                headers: ["", "", "", "", ""],
                rows: tableRows,
            };

            await doc.table(table, {
                x: LAYOUT.tableStart.x,
                y: LAYOUT.tableStart.y,
                width: 505,
                columnsSize: LAYOUT.columnWidths,
                hideHeader: true, 
                divider: {
                    header: { disabled: true },
                    horizontal: { disabled: false, width: 0.5, opacity: 0.5 },
                },
                prepareRow: (row: any, indexColumn: any, indexRow: any, rect: any, rowData: any) => {
                    doc.font("LINESeedSansTH").fontSize(9).fillColor("#333333");
                    const yOffset = rect.y + 2; 
                    if (indexColumn >= 2) { 
                        // Money columns align right
                        doc.text(rowData[indexColumn], rect.x, yOffset, { width: rect.width, align: 'right' });
                        return false; 
                    }
                    // Other columns align left
                    doc.text(rowData[indexColumn], rect.x, yOffset, { width: rect.width, align: 'left' });
                    return false;
                },
            });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * สร้าง HTML สำหรับ Debug Layout (Identical to your provided snippet)
 */
export const buildStatementHtml = async (data: StatementData): Promise<string> => {
    const qrDataUrl = await QRCode.toDataURL(data.wallet.walletUniqueId, { margin: 0 });
    
    const bgPath = path.resolve("public/statement.png");
    let bgBase64 = "";
    if (fs.existsSync(bgPath)) {
        const bgBuffer = fs.readFileSync(bgPath);
        bgBase64 = `data:image/png;base64,${bgBuffer.toString('base64')}`;
    } else {
        console.warn("HTML Debug: Background image not found");
    }

    const validTransactions = data.transactions.filter((tx) => tx.type !== "REWARD");
    const totalIncome = validTransactions.reduce((sum, tx) => (tx.toWalletId === data.currentWalletId ? sum + tx.amount : sum), 0);
    const totalExpense = validTransactions.reduce((sum, tx) => (tx.fromWalletId === data.currentWalletId ? sum + tx.amount : sum), 0);

    let balanceTracker = data.wallet.balance;
    const rowsHtml = validTransactions.map((tx) => {
        const isIncome = tx.toWalletId === data.currentWalletId;
        const amount = tx.amount;
        const balanceAfterTx = balanceTracker;
        if (isIncome) balanceTracker -= amount; else balanceTracker += amount;

        let description = "";
        switch (tx.type) {
            case "DEPOSIT": description = `ฝากเงิน (${tx.from})`; break;
            case "TRANSFER": description = isIncome ? `รับโอน (${tx.fromWallet?.user?.line_display_name || "Unknown"})` : `โอนเงิน (${tx.toWallet?.user?.line_display_name || "Unknown"})`; break;
            case "WITHDRAW": description = `ถอนเงิน (${tx.to})`; break;
            default: description = tx.description || tx.type;
        }

        return `
            <div class="row">
                <div style="padding: 0 4px; width: ${LAYOUT.columnWidths[0]}px">${formatDateTime(tx.createdAt)}</div>
                <div style="padding: 0 4px; width: ${LAYOUT.columnWidths[1]}px">${description}</div>
                <div style="padding: 0 4px; width: ${LAYOUT.columnWidths[2]}px; text-align: right;">${isIncome ? formatCurrency(amount) : "-"}</div>
                <div style="padding: 0 4px; width: ${LAYOUT.columnWidths[3]}px; text-align: right;">${!isIncome ? formatCurrency(amount) : "-"}</div>
                <div style="padding: 0 4px; width: ${LAYOUT.columnWidths[4]}px; text-align: right;">${formatCurrency(balanceAfterTx)}</div>
            </div>
        `;
    }).join("");

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @font-face { font-family: 'LINESeedSansTH'; src: url('/public/fonts/LINESeedSansTH_Bd.ttf'); }
            body { margin: 0; padding: 20px; background: #333; font-family: 'LINESeedSansTH', sans-serif; display: flex; justify-content: center; }
            .page {
                position: relative;
                width: 595px; height: 842px;
                background-image: url('${bgBase64}'); 
                background-size: cover;
                background-color: white;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
                overflow: hidden;
            }
            .abs { position: absolute; }
            
            .qr { left: ${LAYOUT.qrBox.x}px; top: ${LAYOUT.qrBox.y}px; width: ${LAYOUT.qrBox.w}px; height: ${LAYOUT.qrBox.h}px; display: flex; justify-content: center; align-items: center; }
            .qr img { width: ${LAYOUT.qrBox.w - 10}px; height: ${LAYOUT.qrBox.h - 10}px; }
            
            .user-info {  left: ${LAYOUT.userInfoBox.x}px; top: ${LAYOUT.userInfoBox.y}px; width: ${LAYOUT.userInfoBox.w}px; }
            .text-title { font-size: 9pt; color: #000; font-weight: bold; }
            .text-detail { font-size: 9pt; color: #333; white-space: nowrap; }

            .summary-box {  left: ${LAYOUT.summaryBox.x}px; top: ${LAYOUT.summaryBox.y}px; width: ${LAYOUT.summaryBox.w}px; display: flex; }
            
            .summary-details { width: 100%; font-size: 9pt; }
            .sum-row { width: 100%; white-space: nowrap; display: flex; justify-content: space-between; align-items: center; }
            
            .table-container { left: ${LAYOUT.tableStart.x}px; top: ${LAYOUT.tableStart.y}px; width: 502px; font-size: 9pt; color: #333; }
            .row { font-size: 8pt; display: flex;}
        </style>
    </head>
    <body>
        <div class="page">
            <div class="abs qr"><img src="${qrDataUrl}" /></div>
            
            <div class="abs user-info">
                <div class="text-title">ชื่อผู้ใช้: ${data.wallet.user.fullname}</div>
                <div class="text-detail">Wallet ID: ${data.wallet.walletUniqueId}</div>
                <div class="text-detail">ตั้งแต่: ${formatDate(data.startDate)} - ${formatDate(data.endDate)}</div>
            </div>

            <div class="abs summary-box">
                <div class="summary-details">
                    <div class="sum-row" style="color: #000;"><span>รายรับรวม:</span> ${formatCurrency(totalIncome)}.-</div>
                    <div class="sum-row" style="color: #000;"><span>รายจ่ายรวม:</span> ${formatCurrency(totalExpense)}.-</div>
                    <div class="sum-row" style="color: #000;"><span>ยอดคงเหลือสุทธิ:</span> ${formatCurrency(data.wallet.balance)}.-</div>
                </div>
            </div>

            <div class="abs table-container">
                ${rowsHtml}
            </div>
        </div>
    </body>
    </html>
    `;
};

export default buildStatementPdf;