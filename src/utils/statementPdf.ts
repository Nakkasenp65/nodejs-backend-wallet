// import puppeteer from "puppeteer"; // Removed top-level import

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

// Interfaces
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

/**
 * Build Statement PDF using Puppeteer with Pagination
 */
const buildStatementPdf = async (data: StatementData): Promise<Buffer> => {
    let browser;
    try {
        let chromium: any;
        let puppeteerCore: any;
        let launchOptions: any;

        if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
             // Production (Vercel/AWS)
            chromium = await import("@sparticuz/chromium");
            puppeteerCore = await import("puppeteer-core");

            launchOptions = {
                args: chromium.default.args,
                defaultViewport: chromium.default.defaultViewport,
                executablePath: await chromium.default.executablePath(),
                headless: chromium.default.headless,
            };
            browser = await puppeteerCore.default.launch(launchOptions);

        } else {
             // Local Development
             const puppeteer = await import("puppeteer");
             launchOptions = {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
             };
             browser = await puppeteer.default.launch(launchOptions);
        }

        const page = await browser.newPage();

        const htmlContent = await buildStatementHtml(data);
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
        });

        return Buffer.from(pdfBuffer);

    } catch (error) {
        console.error("Puppeteer PDF Generation Error:", error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
};

/**
 * Build HTML Content with Pagination
 */
export const buildStatementHtml = async (data: StatementData): Promise<string> => {
    // 1. Prepare Base64 Assets
    const getBase64 = (filePath: string) => fs.existsSync(filePath) ? fs.readFileSync(filePath).toString('base64') : "";
    
    const fontBase64Bd = getBase64(path.resolve("public/fonts/LINESeedSansTH_Bd.ttf"));
    const fontBase64Rg = getBase64(path.resolve("public/fonts/LINESeedSansTH_Rg.ttf"));
    const bgBase64 = getBase64(path.resolve("public/statement.png"));
    const qrDataUrl = await QRCode.toDataURL(data.wallet.walletUniqueId, { margin: 0 });

    // 2. Data Preparation
    // 2. Data Preparation
    // Sort transactions Oldest First (Ascending)
    // Assuming input data might be descended, we flip it.
    // Ideally we sort by createdAt just to be safe.
    const validTransactions = data.transactions
        .filter((tx) => tx.type !== "REWARD")
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const totalIncome = validTransactions.reduce((sum, tx) => (tx.toWalletId === data.currentWalletId ? sum + tx.amount : sum), 0);
    const totalExpense = validTransactions.reduce((sum, tx) => (tx.fromWalletId === data.currentWalletId ? sum + tx.amount : sum), 0);

    // 3. Pagination Logic
    // --- ADJUST THESE TO CONTROL ROWS PER PAGE ---
    const PAGE_HEIGHT = 1123; // A4 pixel height
    
    // Page 1 Configuration
    const START_Y_P1 = 480;  // Where table starts on Page 1 (must match CSS .table-container top)
    const PAGE_BOTTOM_P1 = 1300; // Stop adding rows when we reach this Y position
    const MAX_H_P1 = PAGE_BOTTOM_P1 - START_Y_P1; 

    // Page 2+ Configuration (Matches Page 1 now)
    const START_Y_P2 = 480; 
    const PAGE_BOTTOM_P2 = 1250; 
    const MAX_H_P2 = PAGE_BOTTOM_P2 - START_Y_P2;

    const ROW_PADDING = 12; 
    const LINE_HEIGHT = 16; 
    const CHARS_PER_LINE = 35;

    const estimateRowHeight = (tx: Transaction): number => {
        let description = getTxDescription(tx, data.currentWalletId);
        const lines = Math.max(1, Math.ceil((description.length || 1) / CHARS_PER_LINE));
        return (lines * LINE_HEIGHT) + ROW_PADDING;
    };

    const getTxDescription = (tx: Transaction, currentWalletId: string) => {
        const isIncome = tx.toWalletId === currentWalletId;
        switch (tx.type) {
            case "DEPOSIT": return `ฝากเงิน (${tx.from})`;
            case "TRANSFER":
                return isIncome
                    ? `รับโอน (${tx.fromWallet?.user?.line_display_name || "Unknown"})`
                    : `โอนเงิน (${tx.toWallet?.user?.line_display_name || "Unknown"})`;
            case "WITHDRAW": return `ถอนเงิน (${tx.to})`;
            default: return tx.description || tx.type;
        }
    };

    // Chunking
    const pages: Transaction[][] = [];
    let currentPageTx: Transaction[] = [];
    let currentH = 0;
    let maxH = MAX_H_P1; // Starts with Page 1 limit

    for (const tx of validTransactions) {
        const h = estimateRowHeight(tx);
        if (currentH + h > maxH) {
            // Push current page
            pages.push(currentPageTx);
            // Reset for new page
            currentPageTx = [];
            currentH = 0;
            maxH = MAX_H_P2; // Subsequent pages use larger area
        }
        currentPageTx.push(tx);
        currentH += h;
    }
    if (currentPageTx.length > 0) pages.push(currentPageTx);

    // 4. Render Pages
    // Calculate Initial Balance (Balance BEFORE the first visible transaction)
    // Formula: FinalBalance (Current) - TotalIncome + TotalExpense = InitialBalance
    let runningBalance = data.wallet.balance - totalIncome + totalExpense;

    const dataRowsHtml = (txs: Transaction[]) => {
        return txs.map(tx => {
            const isIncome = tx.toWalletId === data.currentWalletId;
            const amount = tx.amount;
            
            // For statement: Balance displayed is usually "Balance After Transaction"
            if (isIncome) runningBalance += amount;
            else runningBalance -= amount;

            const rowBalance = runningBalance;

            const description = getTxDescription(tx, data.currentWalletId);

            return `
            <div class="row">
                <div class="col date">${formatDateTime(tx.createdAt)}</div>
                <div class="col desc">${description}</div>
                <div class="col amount income">${isIncome ? formatCurrency(amount) : "-"}</div>
                <div class="col amount expense">${!isIncome ? formatCurrency(amount) : "-"}</div>
                <div class="col amount balance">${formatCurrency(rowBalance)}</div>
            </div>`;
        }).join("");
    };

    // Generate HTML for each page
    const pagesHtml = pages.map((pageTxs, index) => {
        // Every page is now treated like the first page
        const topOffset = START_Y_P1; 
        const rows = dataRowsHtml(pageTxs);

        return `
        <div class="page">
            <div class="background-container"></div>
            <div class="content-container">
                <!-- Header Info (On Every Page) -->
                <div class="qr-code"><img src="${qrDataUrl}" alt="QR"></div>
                <div class="user-info">
                    <div>ชื่อ-นามสกุล: <span class="value">${data.wallet.user.fullname}</span></div>
                    <div>Wallet ID: <span class="value">${data.wallet.walletUniqueId}</span></div>
                    <div>ช่วงเวลา: <span class="value">${formatDate(data.startDate)} - ${formatDate(data.endDate)}</span></div>
                </div>
                <div class="summary-box">
                    <div class="summary-row"><span>รายรับรวม:</span><span>${formatCurrency(totalIncome)}.-</span></div>
                    <div class="summary-row"><span>รายจ่ายรวม:</span><span>${formatCurrency(totalExpense)}.-</span></div>
                    <div class="summary-row"><span>ยอดคงเหลือสุทธิ:</span><span>${formatCurrency(data.wallet.balance)}.-</span></div>
                </div>

                <!-- Table -->
                <div class="table-container" style="top: ${topOffset}px;">
                    ${rows}
                </div>
            </div>
        </div>`;
    }).join("");

    return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <style>
            @font-face { font-family: 'LINESeedSansTH'; src: url(data:font/ttf;charset=utf-8;base64,${fontBase64Rg}) format('truetype'); font-weight: normal; font-style: normal; }
            @font-face { font-family: 'LINESeedSansTH'; src: url(data:font/ttf;charset=utf-8;base64,${fontBase64Bd}) format('truetype'); font-weight: bold; font-style: normal; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; background-color: white; }
            
            .page {
                position: relative;
                width: 210mm;
                height: 297mm;
                page-break-after: always;
                overflow: hidden;
                font-family: 'LINESeedSansTH', sans-serif;
            }
            .page:last-child { page-break-after: avoid; }

            .background-container {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1;
                background-image: url('data:image/png;base64,${bgBase64}');
                background-size: cover; background-repeat: no-repeat;
            }
            
            /* Header Elements (On Every Page) */
            .qr-code { position: absolute; top: 197px; left: 73px; width: 85px; height: 85px; display: flex; justify-content: center; align-items: center; }
            .qr-code img { width: 100%; height: 100%; }
            
            .user-info { position: absolute; top: 315px; left: 75px; width: 310px; font-size: 14px; line-height: 1.6; color: #000; font-weight: bold; display: flex; flex-direction: column; gap: 8px; }
            .user-info .value { font-weight: normal; }
            
            .summary-box { position: absolute; top: 315px; left: 420px; width: 300px; font-size: 14px; line-height: 1.6; color: #000; display: flex; flex-direction: column; gap: 8px; }
            .summary-row { display: flex; justify-content: space-between; font-weight: bold; }

            /* Table Section */
            .table-container { position: absolute; left: 72px; width: 505px; }
            
            .row {
                display: grid;
                grid-template-columns: 90px 210px 95px 95px 95px;
                gap: 16px;
                padding: 6px 0;
                font-size: 10px;
                color: #333;
                align-items: center;
            }
            .col { padding: 0 4px; }
            .date { text-align: left; white-space: nowrap; }
            .desc { text-align: left; word-break: break-word; line-height: 1.4; }
            .amount { text-align: right; }
        </style>
    </head>
    <body>
        ${pagesHtml}
    </body>
    </html>`;
};

export default buildStatementPdf;