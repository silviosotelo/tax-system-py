#!/bin/bash

# Nombre del proyecto
PROJECT="tax-system-py"

# Crear carpetas base
mkdir -p $PROJECT/backend/src/{config,controllers,models,services,jobs,middleware,routes,utils}
mkdir -p $PROJECT/frontend/src/{components/{Dashboard,IVA,Transactions,IRP,Settings,Shared},services,hooks,contexts,utils}

# Archivos del backend
touch $PROJECT/backend/src/config/{database.ts,scraper.ts,notifications.ts}
touch $PROJECT/backend/src/controllers/{auth.controller.ts,dashboard.controller.ts,iva.controller.ts,transactions.controller.ts,irp.controller.ts,scraper.controller.ts,settings.controller.ts}
touch $PROJECT/backend/src/models/{User.ts,Transaction.ts,TaxObligation.ts,Notification.ts,SystemSettings.ts}
touch $PROJECT/backend/src/services/{marangatuScraper.service.ts,ivaCalculator.service.ts,irpCalculator.service.ts,notification.service.ts,rucValidator.service.ts}
touch $PROJECT/backend/src/jobs/{scraperJob.ts,notificationJob.ts}
touch $PROJECT/backend/src/middleware/{auth.middleware.ts,validation.middleware.ts}
touch $PROJECT/backend/src/routes/index.ts
touch $PROJECT/backend/src/utils/{encryption.ts,logger.ts}
touch $PROJECT/backend/package.json
touch $PROJECT/backend/tsconfig.json

# Archivos del frontend
touch $PROJECT/frontend/src/services/api.ts
touch $PROJECT/frontend/package.json
touch $PROJECT/frontend/tsconfig.json

# Archivo docker-compose
touch $PROJECT/docker-compose.yml

echo "✅ Estructura del proyecto '$PROJECT' creada correctamente."
