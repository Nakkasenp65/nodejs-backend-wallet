# Project Structure

```text
nodejs-backend-wallet/
├── .env                        # Environment variables configuration
├── .gitignore                  # Git ignore rules
├── eslint.config.mjs           # ESLint configuration
├── HEALTH_CHECK.md             # Health check documentation
├── jsdoc.json                  # JSDoc configuration
├── jsDocGenerated/             # Generated JSDoc documentation
├── package.json                # Project metadata and dependencies
├── pdf-preview.js              # PDF preview script
├── prisma/                     # Database configuration
│   ├── schema.prisma           # Database schema definition
│   └── migrations/             # Database migration history
├── public/                     # Static assets
├── src/                        # Main source code
│   ├── api/                    # API implementation
│   │   └── v1/                 # API Version 1 modules
│   │       ├── admins/         # Admin management
│   │       ├── broadcasts/     # Broadcast messaging
│   │       ├── cron/           # Cron job endpoints
│   │       ├── goals/          # Goal management
│   │       ├── health/         # Health check endpoints
│   │       ├── images/         # Image handling
│   │       ├── lines/          # Line integration
│   │       ├── missions/       # Mission management
│   │       ├── notifications/  # Notification system
│   │       ├── plans/          # Plan/Subscription management
│   │       ├── products/       # Product management
│   │       ├── qstash/         # QStash integration
│   │       ├── slips/          # Transaction slips
│   │       ├── transactions/   # Transaction processing
│   │       ├── user-missions/  # User mission tracking
│   │       ├── users/          # User account management
│   │       └── wallets/        # Wallet management
│   ├── app.ts                  # Express application setup
│   ├── generated/              # Auto-generated code
│   ├── index.ts                # Application entry point
│   ├── libs/                   # External library wrappers
│   │   └── prisma.ts           # Prisma client instance
│   ├── middlewares/            # Custom Express middlewares
│   │   ├── adminAuth.ts        # Admin authentication middleware
│   │   ├── auth.ts             # User authentication middleware
│   │   ├── cors.ts             # CORS configuration
│   │   ├── cron.ts             # Cron job middleware
│   │   ├── error.ts            # Error handling middleware
│   │   └── validate.ts         # Validation middleware
│   ├── types/                  # TypeScript type definitions
│   │   ├── express.d.ts        # Express type extensions
│   │   └── transaction.types.ts # Transaction related types
│   ├── utils/                  # Shared utility functions
│   │   ├── ApiError.ts         # Custom API error class
│   │   ├── axios.ts            # Axios instance/helper
│   │   ├── bankData.ts         # Bank data utilities
│   │   ├── bankIcon.ts         # Bank icon utilities
│   │   ├── catchAsync.ts       # Async error catcher
│   │   ├── email.ts            # Email sending utility
│   │   ├── line.ts             # Line API utilities
│   │   ├── pick.ts             # Object property picker
│   │   ├── random.ts           # Random value generator
│   │   └── statementPdf.ts     # PDF statement generator
│   └── validations/            # Request validation schemas
│       ├── goal.validation.js  # Goal validation schemas
│       ├── mission.validation.js # Mission validation schemas
│       ├── product.validation.js # Product validation schemas
│       └── user.validation.js  # User validation schemas
├── tsconfig.json               # TypeScript configuration
├── TYPESCRIPT_SETUP.md         # TypeScript setup documentation
└── vercel.json                 # Vercel deployment configuration
```

## Key Directories

- **`src/api/v1/`**: Contains the core business logic organized by feature. Each module typically contains:
  - `*.controller.ts`: Request handlers.
  - `*.service.ts`: Business logic and database calls.
  - `*.route.ts`: Route definitions.

- **`prisma/`**: Manages the database schema and migrations.
- **`src/middlewares/`**: Contains global and route-specific middlewares.
