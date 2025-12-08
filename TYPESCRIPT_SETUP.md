# 🎯 Mixed TypeScript & JavaScript Setup Guide

## ✅ What We Just Set Up

You can now use **TypeScript and JavaScript together** in the same project!

---

## 📁 Current File Structure

```
nodejs-backend-wallet/
├── src/
│   ├── api/v1/transactions/
│   │   ├── transaction.controller.ts    ← NEW: TypeScript! ✨
│   │   ├── transaction.route.ts         ← NEW: TypeScript! ✨
│   │   └── transaction.service.js       ← Still JavaScript ✅
│   ├── types/
│   │   └── transaction.types.ts         ← NEW: Type definitions ✨
│   ├── utils/
│   │   ├── catchAsync.js                ← Still JavaScript ✅
│   │   └── ApiError.js                  ← Still JavaScript ✅
│   └── index.js                         ← Still JavaScript ✅
├── tsconfig.json                        ← NEW ✨
└── package.json                         ← Updated ✨
```

---

## 🚀 How to Run

### Development (Local)

```bash
npm run dev
# Uses tsx to run mixed TS/JS files
```

### Type Checking (Optional)

```bash
npm run type-check
# Checks TypeScript files without building
```

### Build for Production

```bash
npm run build
# Compiles TS → JS in dist/ folder
```

### Production

```bash
npm start
# Runs compiled JS from dist/
```

### Legacy Dev Mode

```bash
npm run start:dev
# Old way - still works!
```

---

## 🔄 How It Works

### 1. **Import TS from JS (Works!)**

```javascript
// In user.service.js (JavaScript file)
import transactionController from "../transactions/transaction.controller.js";
// Even though it's .ts file, import as .js ✅
```

### 2. **Import JS from TS (Works!)**

```typescript
// In transaction.controller.ts (TypeScript file)
import catchAsync from "../../../utils/catchAsync.js";
// JavaScript file - works perfectly! ✅
```

### 3. **Mixed Imports in Routes**

```typescript
// transaction.route.ts
import transactionController from "./transaction.controller.js"; // TS file
import slipService from "../slips/slip.service.js"; // JS file
// Both work together! ✅
```

---

## 📋 Migration Strategy

### Phase 1: Utilities (Start Here) ✅

Convert simple, standalone files first:

- `src/utils/ApiError.js` → `ApiError.ts`
- `src/utils/catchAsync.js` → `catchAsync.ts`
- `src/utils/random.js` → `random.ts`

### Phase 2: Type Definitions ✅

Create type files that both JS and TS can use:

- `src/types/transaction.types.ts` ← Already created!
- `src/types/user.types.ts`
- `src/types/wallet.types.ts`

### Phase 3: One Module at a Time ✅

Convert one complete module:

- `transaction.controller.ts` ← Already done!
- `transaction.route.ts` ← Already done!
- Keep `transaction.service.js` as JS for now

### Phase 4: Gradually Expand

Convert more modules as you feel comfortable:

- `user.controller.js` → `user.controller.ts`
- `wallet.controller.js` → `wallet.controller.ts`
- And so on...

---

## ⚠️ Important Notes

### Import Extensions

Always use `.js` extension in imports, even for `.ts` files:

```typescript
// ✅ CORRECT
import controller from "./transaction.controller.js";

// ❌ WRONG
import controller from "./transaction.controller.ts";
import controller from "./transaction.controller";
```

### Vercel Deployment

- Vercel will automatically detect TypeScript
- It will run `npm run build` before deployment
- Make sure `dist/` is in `.gitignore` (build happens on Vercel)

### Type Safety Level

Current `tsconfig.json` has **lenient settings**:

- `strict: false` - won't complain about many things
- `noImplicitAny: false` - allows `any` types
- You can increase strictness gradually as you convert more files

---

## 🧪 Testing the Setup

### 1. Test Type Checking

```bash
npm run type-check
```

Should complete without errors (only checks TS files)

### 2. Test Development Server

```bash
npm run dev
```

Should start server with both JS and TS files

### 3. Test Build

```bash
npm run build
```

Should create `dist/` folder with compiled JS

---

## 🎓 Example: Add Types to Existing JS File (Using JSDoc)

You don't even need to convert to TS! Use JSDoc with types:

```javascript
// transaction.service.js (still JavaScript!)

/**
 * @typedef {import('../types/transaction.types.js').CreateWithdrawRequestBody} WithdrawRequest
 */

/**
 * Create withdrawal transaction
 * @param {string} userId
 * @param {number} amount
 * @param {import('../types/transaction.types.js').WithdrawalDetails} details
 * @returns {Promise<Transaction>}
 */
const createWithdrawTransaction = async (userId, amount, details) => {
  // Your code here
  // VSCode will now have autocomplete! 🎉
};
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module './file.js'"

**Solution:** Make sure TypeScript files exist and `tsconfig.json` has `allowJs: true`

### Error: "Module not found" in built code

**Solution:** Check that import paths use `.js` extension, not `.ts`

### Error: Type errors blocking build

**Solution:** Add `// @ts-ignore` above the line temporarily, fix later

### Vercel build fails

**Solution:**

1. Check `vercel.json` has `buildCommand`
2. Ensure `typescript` is in `devDependencies`
3. Check Vercel logs for specific error

---

## ✨ Benefits You Get Immediately

### 1. **Autocomplete Everywhere**

VSCode will suggest properties and methods for:

- Express Request/Response objects
- Prisma models
- Custom types

### 2. **Catch Errors Before Runtime**

```typescript
// TypeScript catches this at compile time:
res.httpStatus(OK).json(data);
//  ^^^^^^^^^^^ Error: Property doesn't exist
```

### 3. **Safe Refactoring**

Rename a function? TypeScript finds all usages across TS AND JS files!

### 4. **Better Documentation**

Types are self-documenting - no need to read code to understand parameters

---

## 🎯 Next Steps

1. ✅ **Test the setup** - Run `npm run dev` to confirm everything works
2. ✅ **Convert one utility file** - Start with `ApiError.js` → `ApiError.ts`
3. ✅ **Add more types** - Create type definitions for your domain objects
4. ✅ **Gradually migrate** - One file at a time, no rush!
5. ✅ **Deploy** - Push to Vercel and verify it builds correctly

---

## 🚨 Critical Fixes Already Applied

In the TypeScript controller, I fixed:

### Bug #1: `res.httpStatus()` → `res.status()`

```typescript
// ❌ Before (in JS file)
res.httpStatus(OK).json(transactions);

// ✅ After (in TS file)
res.status(httpStatus.OK).json(transactions);
```

### Bug #2: Route Order Fixed

```typescript
// ✅ Specific routes BEFORE parameterized routes
transactionRouter.get("/thai/:walletId", ...);       // First
transactionRouter.get("/success/:walletId", ...);    // Second
transactionRouter.get("/:walletId", ...);            // Last
```

---

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma TypeScript Guide](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/use-custom-model-and-field-names)
- [Express TypeScript Guide](https://expressjs.com/en/advanced/best-practice-performance.html)

---

**🎉 You're all set! TypeScript and JavaScript now work together seamlessly!**
