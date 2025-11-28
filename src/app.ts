import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import v1Router from "./api/v1/index.js";
import ApiError from "./utils/ApiError.js";
import httpStatus from "http-status";
import error from "./middlewares/error.js";
import dotenv from "dotenv";
import prisma from "./libs/prisma.js";
import buildStatementPdf, { buildStatementHtml } from "./utils/statementPdf.js";

const app = express();
dotenv.config({ path: "./../.env" });
if (process.env.NODE_ENV === "dev") {
    console.log("Running in development mode");
    app.use(morgan("dev"));
} else {
    app.use(morgan("combined"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/public", express.static("public")); // Serve public files for debug page

app.get("/", (req: Request, res: Response) => {
    res.status(200).json({ message: "test backend wallet" });
});

app.get("/debug-statement", async (req: Request, res: Response) => {
    try {
        const line_user_id = "U006fb519ba07650932c6981af95d0620";
        const id = "692954f13eb42382e6f8c244";

        const wallet = await prisma.wallet.findFirst({
            where: { user: { line_user_id, id } },
            include: { user: true },
        });

        if (!wallet) {
            res.status(404).send("Wallet not found");
            return;
        }

        const transactions = await prisma.transaction.findMany({
            where: { OR: [{ fromWalletId: wallet.id }, { toWalletId: wallet.id }] },
            include: { fromWallet: { include: { user: true } }, toWallet: { include: { user: true } } },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        const statementData = {
            transactions: transactions.map((t: any) => ({ ...t, amount: t.verifiedAmount || t.amount })),
            wallet: wallet,
            currentWalletId: wallet.id,
            startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
            endDate: new Date(),
        };

        const html = await buildStatementHtml(statementData);
        res.send(html);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error generating debug HTML");
    }
});

app.get("/test-statement", async (req: Request, res: Response) => {
    try {
        const line_user_id = "U006fb519ba07650932c6981af95d0620";
        const id = "692954f13eb42382e6f8c244";

        const wallet = await prisma.wallet.findFirst({
            where: {
                user: {
                    line_user_id: line_user_id,
                    id: id,
                },
            },
            include: {
                user: true,
            },
        });

        if (!wallet) {
            res.status(404).json({ message: "Wallet not found" });
            return;
        }

        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [{ fromWalletId: wallet.id }, { toWalletId: wallet.id }],
            },
            include: {
                fromWallet: { include: { user: true } },
                toWallet: { include: { user: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 20, // Limit for testing
        });

        const statementData = {
            transactions: transactions.map((t: any) => ({
                ...t,
                amount: t.verifiedAmount || t.amount, // Handle verifiedAmount if needed
            })),
            wallet: wallet,
            currentWalletId: wallet.id,
            startDate: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
            endDate: new Date(),
        };

        const pdfBuffer = await buildStatementPdf(statementData);

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "inline; filename=statement.pdf",
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error generating PDF", error });
    }
});

// URL/v1
app.use("/v1", v1Router);
app.use((req: Request, res: Response, next: NextFunction) => {
    next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

app.use(error.errorConverter);
app.use(error.errorHandler);

export default app;
