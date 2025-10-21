tax-system-py/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── scraper.ts
│   │   │   └── notifications.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── iva.controller.ts
│   │   │   ├── transactions.controller.ts
│   │   │   ├── irp.controller.ts
│   │   │   ├── scraper.controller.ts
│   │   │   └── settings.controller.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Transaction.ts
│   │   │   ├── TaxObligation.ts
│   │   │   ├── Notification.ts
│   │   │   └── SystemSettings.ts
│   │   ├── services/
│   │   │   ├── marangatuScraper.service.ts
│   │   │   ├── ivaCalculator.service.ts
│   │   │   ├── irpCalculator.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── rucValidator.service.ts
│   │   ├── jobs/
│   │   │   ├── scraperJob.ts
│   │   │   └── notificationJob.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── routes/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── encryption.ts
│   │       └── logger.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── IVA/
│   │   │   ├── Transactions/
│   │   │   ├── IRP/
│   │   │   ├── Settings/
│   │   │   └── Shared/
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── hooks/
│   │   ├── contexts/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
└── docker-compose.yml