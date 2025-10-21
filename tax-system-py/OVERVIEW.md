# SISTEMA DE GESTIÓN TRIBUTARIA PARAGUAY
## Resumen Ejecutivo y Guía de Implementación

---

## 📋 RESUMEN DEL PROYECTO

### Objetivo
Sistema completo de gestión tributaria para profesionales independientes en Paraguay (RUC 4895448-9 SILVIO ANDRES SOTELO), que automatiza el cálculo de IVA mensual e IRP anual, con web scraping de Marangatu, registro manual de transacciones, y dashboard con gráficos y proyecciones.

### Alcance Funcional

#### ✅ Implementado en esta entrega

**1. Base de Datos PostgreSQL (schema.sql)**
- 13 tablas principales con relaciones
- 2 vistas materializadas optimizadas
- Funciones PL/pgSQL para cálculos tributarios
- Triggers automáticos
- Catálogo de 14 categorías de deducción precargadas
- Usuario demo incluido

**2. Backend Node.js + TypeScript**
- Servicio de Web Scraping de Marangatu (marangatuScraper.service.ts)
  * Login automático
  * Extracción de facturas emitidas
  * Extracción de facturas recibidas
  * Manejo de errores y screenshots
- Servicios de Cálculo Tributario (calculators.service.ts)
  * IVA mensual con débito/crédito fiscal
  * IRP anual con tramos progresivos (8%, 9%, 10%)
  * Proyecciones al cierre del año
  * Generación de datos para F-120 y F-515

**3. Frontend React + TypeScript**
- Dashboard principal con resumen ejecutivo
- Gestión completa de transacciones
- Gráficos interactivos (Recharts)
- Sistema de notificaciones

**4. Infraestructura Docker**
- docker-compose.yml con 5 servicios
- Orquestación completa (PostgreSQL, Backend, Frontend, Scheduler, PgAdmin)
- Health checks y volúmenes persistentes

---

## 🏗️ ARQUITECTURA DETALLADA

### Flujo de Datos Principal

```
┌─────────────────┐
│    Usuario      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│         Frontend React              │
│  - Dashboard con gráficos           │
│  - Gestión de transacciones         │
│  - Configuración de scraping        │
└────────┬────────────────────────────┘
         │ API REST
         ▼
┌─────────────────────────────────────┐
│        Backend Node.js              │
│  ┌──────────────────────────────┐   │
│  │  Controllers                 │   │
│  │  - Dashboard                 │   │
│  │  - Transactions              │   │
│  │  - Scraper                   │   │
│  └──────────┬───────────────────┘   │
│             │                        │
│  ┌──────────▼───────────────────┐   │
│  │  Services                    │   │
│  │  - MarangatuScraper          │   │
│  │  - IVACalculator             │   │
│  │  - IRPCalculator             │   │
│  │  - NotificationService       │   │
│  │  - RUCValidator              │   │
│  └──────────┬───────────────────┘   │
└─────────────┼───────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │   PostgreSQL 14      │
   │  - 13 tablas         │
   │  - Vistas MV         │
   │  - Funciones SQL     │
   └──────────────────────┘

┌─────────────────────────────────────┐
│      Scheduler (Cron Jobs)          │
│  - Auto-scraping semanal            │
│  - Notificaciones diarias           │
│  - Refresh de vistas MV             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      Sistema Marangatu (SET)        │
│  - Puppeteer scraping               │
│  - Facturas emitidas/recibidas      │
└─────────────────────────────────────┘
```

---

## 🔧 MÓDULOS DEL SISTEMA

### Módulo 1: Gestión de Transacciones

**Funcionalidades:**
- ✅ Registro manual de ingresos (facturas emitidas)
- ✅ Registro manual de egresos (compras con talonario)
- ✅ Importación desde Excel de Marangatu
- ✅ Web scraping automático de Marangatu
- ✅ Validación de RUC mediante API SET
- ✅ Categorización automática de gastos
- ✅ Cálculo automático de IVA deducible
- ✅ Edición y eliminación de transacciones
- ✅ Filtros avanzados y búsqueda

**Tecnologías:**
- React + TypeScript para UI
- API REST para CRUD
- PostgreSQL para almacenamiento
- Puppeteer para scraping

**Archivos clave:**
- `/frontend/src/components/Transactions/TransactionsManager.tsx`
- `/backend/src/services/marangatuScraper.service.ts`
- `/backend/src/controllers/transactions.controller.ts`

---

### Módulo 2: Cálculo de IVA Mensual

**Funcionalidades:**
- ✅ Cálculo automático de débito fiscal (IVA cobrado)
- ✅ Cálculo de crédito fiscal con porcentajes según categoría
- ✅ Saldo a pagar o a favor
- ✅ Detalle de todas las transacciones del período
- ✅ Generación de datos pre-llenados para Formulario 120
- ✅ Gráfico de evolución últimos 12 meses
- ✅ Alertas de vencimiento (7, 3, 1 día antes)

**Lógica de Cálculo:**
```typescript
// IVA Débito: IVA cobrado en ventas
debitoFiscal = SUM(iva_amount WHERE type='INGRESO')

// IVA Crédito: IVA deducible en compras
creditoFiscal = SUM(
  iva_amount * (deduction_percentage / 100) 
  WHERE type='EGRESO' AND is_creditable_iva=true
)

// Saldo a pagar
saldoIVA = debitoFiscal - creditoFiscal
```

**Archivo clave:**
- `/backend/src/services/calculators.service.ts` (clase IVACalculatorService)

---

### Módulo 3: Cálculo de IRP Anual

**Funcionalidades:**
- ✅ Cálculo por tramos progresivos según Ley 6380/2019
- ✅ Gestión de deducciones (gastos de actividad + personales)
- ✅ Proyección al cierre del año fiscal
- ✅ Simulador interactivo de escenarios
- ✅ Generación de datos pre-llenados para Formulario 515
- ✅ Desglose de gastos por categoría

**Lógica de Cálculo:**
```typescript
// Renta Neta
rentaNeta = ingresosBrutos - gastosDeducibles

// Cálculo por tramos
tramo1 = MIN(rentaNeta, 50_000_000) * 0.08
tramo2 = MIN(MAX(rentaNeta - 50_000_000, 0), 100_000_000) * 0.09
tramo3 = MAX(rentaNeta - 150_000_000, 0) * 0.10

totalIRP = tramo1 + tramo2 + tramo3
aPagar = totalIRP - retenciones
```

**Tramos aplicables:**
- Hasta Gs. 50.000.000: 8%
- De Gs. 50.000.001 a Gs. 150.000.000: 9%
- Más de Gs. 150.000.000: 10%

**Archivo clave:**
- `/backend/src/services/calculators.service.ts` (clase IRPCalculatorService)

---

### Módulo 4: Dashboard y Reportes

**Funcionalidades:**
- ✅ Resumen del mes actual (IVA próximo)
- ✅ Resumen del año actual (IRP proyectado)
- ✅ Alerta de próximo vencimiento
- ✅ Gráfico de evolución IVA (12 meses)
- ✅ Gráfico de ingresos vs egresos (año actual)
- ✅ Gráfico de distribución de gastos por categoría
- ✅ Centro de notificaciones
- ✅ Acciones rápidas (nueva transacción, scraping, reportes)

**Archivos clave:**
- `/frontend/src/components/Dashboard/Dashboard.tsx`
- `/backend/src/controllers/dashboard.controller.ts`

---

### Módulo 5: Web Scraping de Marangatu

**Funcionamiento:**

1. **Inicialización de Puppeteer** (navegador headless)
2. **Login en Marangatu** con credenciales encriptadas
3. **Navegación a módulos:**
   - Comprobantes Emitidos (facturas de venta)
   - Compras a Imputar (facturas recibidas)
4. **Extracción de datos** desde tablas HTML
5. **Parsing y validación** de montos y fechas
6. **Almacenamiento** en tabla `transactions`
7. **Notificación** al usuario del resultado

**Proceso de scraping:**
```
Usuario → Config credenciales Marangatu (encriptadas)
          ↓
Backend → Ejecuta scraping (manual o programado)
          ↓
Puppeteer → Abre navegador headless
          ↓
Login → Navega a módulos → Extrae datos
          ↓
Parser → Valida y formatea datos
          ↓
DB → Inserta en tabla transactions
          ↓
Notificación → "X facturas importadas"
```

**Manejo de errores:**
- Login fallido → Notificación + screenshot del error
- Timeout de red → Reintento automático (3 veces)
- Cambio en estructura del sitio → Log detallado + captura de pantalla

**Archivo clave:**
- `/backend/src/services/marangatuScraper.service.ts`

---

### Módulo 6: Sistema de Notificaciones

**Tipos de notificaciones:**

1. **Vencimientos tributarios:**
   - 7 días antes (prioridad MEDIUM, color amarillo)
   - 3 días antes (prioridad HIGH, color naranja)
   - 1 día antes (prioridad CRITICAL, color rojo)

2. **Scraping:**
   - Inicio de scraping
   - Scraping exitoso (con total importado)
   - Scraping fallido (con detalles del error)

3. **Importaciones:**
   - Importación exitosa desde Excel
   - Errores en importación

4. **Sistema:**
   - Actualización disponible
   - Mantenimiento programado

**Canales de notificación:**
- In-app (centro de notificaciones con badge)
- Email (si está configurado SMTP)

**Job programado:**
```javascript
// Ejecuta diariamente a las 8:00 AM
cron.schedule('0 8 * * *', async () => {
  // Buscar obligaciones próximas a vencer
  // Generar notificaciones según días restantes
  // Enviar emails si está habilitado
  // Marcar notificaciones como enviadas
});
```

---

## 📊 MODELO DE DATOS

### Tablas Principales

```
users (usuarios del sistema)
  ├── id (PK)
  ├── ruc, dv, full_name
  ├── email, password_hash
  └── activity_type

transactions (todas las transacciones)
  ├── id (PK)
  ├── user_id (FK → users)
  ├── transaction_date, type (INGRESO/EGRESO)
  ├── document_type, document_number, timbrado, cdc
  ├── ruc_counterpart, dv_counterpart, name_counterpart
  ├── gross_amount, iva_rate, iva_amount, net_amount
  ├── is_creditable_iva, iva_deduction_category, iva_deduction_percentage
  ├── creditable_iva_amount (calculado automáticamente)
  ├── is_deductible_irp, irp_deduction_category
  └── source (MANUAL, SCRAPER, IMPORT, API)

tax_obligations (obligaciones tributarias)
  ├── id (PK)
  ├── user_id (FK → users)
  ├── tax_type (IVA, IRP)
  ├── fiscal_period, due_date
  ├── calculated_tax, withholdings_amount
  └── status (PENDING, PAID, OVERDUE, CANCELLED)

notifications (notificaciones)
  ├── id (PK)
  ├── user_id (FK → users)
  ├── type, priority
  ├── title, message
  ├── read, read_at
  └── related_obligation_id (FK → tax_obligations)

scraper_sessions (historial de scraping)
  ├── id (PK)
  ├── user_id (FK → users)
  ├── scrape_type, period_from, period_to
  ├── status, total_found, total_imported, total_errors
  └── results (JSONB), error_log

system_settings (configuraciones)
  ├── id (PK)
  ├── user_id (FK → users)
  ├── marangatu_username, marangatu_password_encrypted
  ├── auto_scrape_enabled, auto_scrape_frequency
  ├── email_notifications, notification_days_before
  ├── set_apikey
  └── known_suppliers (JSONB)

deduction_categories (catálogo de deducciones)
  ├── id (PK)
  ├── code, name, description
  ├── applies_to_iva, applies_to_irp
  ├── iva_deduction_percentage (0, 30, 50, 100)
  └── legal_reference

audit_log (auditoría completa)
  ├── id (PK)
  ├── user_id (FK → users)
  ├── action, entity_type, entity_id
  ├── old_values (JSONB), new_values (JSONB)
  └── ip_address, user_agent, created_at
```

### Vistas Materializadas (Optimización)

```sql
-- Resumen mensual de IVA
CREATE MATERIALIZED VIEW mv_monthly_iva_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', transaction_date) as period,
  SUM(CASE WHEN type='INGRESO' THEN iva_amount ELSE 0 END) as debito_fiscal,
  SUM(CASE WHEN type='EGRESO' AND is_creditable_iva=true 
      THEN creditable_iva_amount ELSE 0 END) as credito_fiscal,
  -- ... más campos
FROM transactions
GROUP BY user_id, period;

-- Resumen anual de IRP
CREATE MATERIALIZED VIEW mv_annual_irp_summary AS
SELECT 
  user_id,
  DATE_TRUNC('year', transaction_date) as fiscal_year,
  SUM(CASE WHEN type='INGRESO' THEN net_amount ELSE 0 END) as gross_income,
  SUM(CASE WHEN type='EGRESO' AND is_deductible_irp=true 
      THEN net_amount ELSE 0 END) as deductible_expenses,
  -- ... más campos
FROM transactions
GROUP BY user_id, fiscal_year;
```

**Refresh automático:**
- Diariamente a las 2:00 AM (job programado)
- Después de cada importación masiva
- Al cambio de mes (para cerrar período IVA)

---

## 🚀 PROCESO DE INSTALACIÓN

### Paso 1: Preparar el Entorno

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/tax-system-py.git
cd tax-system-py

# Copiar archivo de entorno
cp .env.example .env

# Editar .env con credenciales reales
nano .env
```

**Variables críticas a configurar:**
- `DB_PASSWORD` - Password seguro para PostgreSQL
- `JWT_SECRET` - Secret de 32 caracteres para JWT
- `ENCRYPTION_KEY` - Key de 32 caracteres para encriptar credenciales
- `SMTP_*` - Configuración de email (opcional)

### Paso 2: Generar Secrets Seguros

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# DB_PASSWORD
openssl rand -base64 32
```

### Paso 3: Construir e Iniciar Servicios

```bash
# Build de todas las imágenes
docker-compose build

# Iniciar servicios
docker-compose up -d

# Verificar estado
docker-compose ps

# Ver logs
docker-compose logs -f
```

### Paso 4: Verificar Instalación

```bash
# Test de conectividad del backend
curl http://localhost:3001/api/health

# Debería responder:
# {"status":"ok","database":"connected","timestamp":"2025-10-21T..."}

# Acceder al frontend
# Abrir navegador: http://localhost:3000
```

### Paso 5: Configuración Inicial en la App

1. Login con credenciales demo: `demo@taxsystem.py` / `demo123456`
2. Ir a Configuración → Marangatu
3. Ingresar usuario y clave de Marangatu
4. (Opcional) Configurar API Key de la SET
5. Guardar configuración

---

## 📅 CALENDARIO DE VENCIMIENTOS 2025

Para RUC terminado en **9** (SILVIO ANDRES SOTELO):

### IVA Mensual (Día 25 de cada mes)

| Período | Vencimiento | Observación |
|---------|-------------|-------------|
| Diciembre 2024 | 27 enero 2025 | Lunes (25 es sábado) |
| Enero 2025 | 25 febrero 2025 | Martes |
| Febrero 2025 | 25 marzo 2025 | Martes |
| Marzo 2025 | 25 abril 2025 | Viernes |
| Abril 2025 | 26 mayo 2025 | Lunes (25 es domingo) |
| Mayo 2025 | 25 junio 2025 | Miércoles |
| Junio 2025 | 25 julio 2025 | Viernes |
| Julio 2025 | 25 agosto 2025 | Lunes |
| Agosto 2025 | 25 septiembre 2025 | Jueves |
| Septiembre 2025 | 27 octubre 2025 | Lunes (25 es sábado) |
| Octubre 2025 | 25 noviembre 2025 | Martes |
| Noviembre 2025 | 25 diciembre 2025 | Jueves |

### IRP Anual (Una vez al año)

| Ejercicio Fiscal | Vencimiento Declaración |
|------------------|------------------------|
| 2024 | 25 marzo 2025 |
| 2025 | 25 marzo 2026 |

---

## 🔍 CASOS DE USO COMPLETOS

### Caso de Uso 1: Registro Manual de Factura con Talonario

**Escenario:** El contador recibe una factura de alquiler de oficina con talonario (no electrónica) por Gs. 3.300.000 (incluye IVA 10%).

**Pasos:**
1. Usuario accede a "Transacciones"
2. Click en "+ Nueva Transacción"
3. Completa formulario:
   - Fecha: 15/10/2025
   - Tipo: Egreso
   - RUC: 123456-7 (inmobiliaria)
   - Sistema valida RUC automáticamente vía API SET
   - Nombre se auto-completa: "INMOBILIARIA EJEMPLO S.A."
   - N° Factura: 001-001-0012345
   - Monto Total: 3.300.000
   - Tasa IVA: 10%
   - Categoría: "Oficina de uso exclusivo" (100% deducible)
4. Sistema calcula automáticamente:
   - Monto neto: Gs. 3.000.000
   - IVA: Gs. 300.000
   - IVA deducible: Gs. 300.000 (100%)
5. Usuario confirma y guarda
6. Sistema:
   - Inserta registro en tabla `transactions`
   - Marca como `source='MANUAL'`
   - Trigger calcula `creditable_iva_amount = 300000`
   - Actualiza vista materializada `mv_monthly_iva_summary`
7. Dashboard se actualiza instantáneamente mostrando nuevo crédito fiscal

**Resultado:**
- Transacción registrada
- Crédito fiscal de Gs. 300.000 sumado al mes de octubre
- Visible en cálculo de IVA del mes

---

### Caso de Uso 2: Web Scraping Automático Semanal

**Escenario:** El sistema ejecuta scraping automático todos los lunes a las 2:00 AM.

**Pasos:**
1. Scheduler ejecuta job programado (cron: `0 2 * * 1`)
2. Job inicia `MarangatuScraperService`
3. Recupera credenciales encriptadas de `system_settings`
4. Desencripta password de Marangatu
5. Puppeteer:
   - Abre navegador headless
   - Navega a https://marangatu.set.gov.py/eset/login
   - Completa formulario de login
   - Espera redirección al dashboard
   - Captura screenshot del dashboard (debugging)
6. Navega a "Comprobantes Emitidos"
   - Completa formulario de búsqueda (últimos 7 días)
   - Extrae datos de tabla HTML
   - Parsea: fecha, RUC cliente, monto, IVA
7. Navega a "Compras a Imputar"
   - Completa formulario de consulta
   - Extrae datos de tabla HTML
   - Parsea: fecha, RUC proveedor, monto, IVA 10%, IVA 5%
8. Para cada documento extraído:
   - Verifica si ya existe (por document_number + date)
   - Si es nuevo, inserta en `transactions` con `source='SCRAPER'`
   - Categoriza automáticamente según RUC conocido
9. Cierra navegador
10. Registra sesión en `scraper_sessions`:
    - Total encontrado: 15 documentos
    - Total importado: 12 nuevos
    - Total errores: 0
    - Status: COMPLETED
11. Crea notificación:
    - Título: "Scraping Automático Completado"
    - Mensaje: "Se importaron 12 nuevos comprobantes"
    - Prioridad: MEDIUM
12. Refresca vistas materializadas

**Resultado:**
- 12 transacciones nuevas importadas automáticamente
- Notificación al usuario del resultado
- IVA del mes actualizado con los nuevos datos

---

### Caso de Uso 3: Proyección de IRP a Mitad de Año

**Escenario:** Es julio 2025 y el usuario quiere saber cuánto IRP pagará en marzo 2026 si sigue facturando al mismo ritmo.

**Pasos:**
1. Usuario accede a "IRP" → "Proyección Anual"
2. Sistema consulta:
   - Ingresos acumulados enero-julio: Gs. 65.000.000
   - Gastos deducibles acumulados: Gs. 18.000.000
   - Renta neta actual: Gs. 47.000.000
3. Calcula promedio mensual:
   - Ingreso promedio: Gs. 9.285.714 (65M / 7 meses)
   - Gasto promedio: Gs. 2.571.429 (18M / 7 meses)
4. Proyecta al cierre del año (5 meses restantes):
   - Ingresos proyectados totales: 65M + (9.285.714 * 5) = Gs. 111.428.570
   - Gastos proyectados totales: 18M + (2.571.429 * 5) = Gs. 30.857.145
   - Renta neta proyectada: Gs. 80.571.425
5. Calcula IRP por tramos:
   - Tramo 1 (hasta 50M): Gs. 50.000.000 * 8% = Gs. 4.000.000
   - Tramo 2 (50M-80.571M): Gs. 30.571.425 * 9% = Gs. 2.751.428
   - Tramo 3: Gs. 0
   - **Total IRP proyectado: Gs. 6.751.428**
6. Dashboard muestra:
   - Gráfico de tendencia mensual
   - Barra de progreso (58% del año transcurrido)
   - Alerta: "Estás en el tramo del 9%"
7. Usuario usa simulador interactivo:
   - Cambia "Ingresos proyectados ago-dic" a: Gs. 50.000.000
   - Cambia "Gastos proyectados ago-dic" a: Gs. 15.000.000
   - Sistema recalcula en tiempo real:
     * Nueva renta neta proyectada: Gs. 82.000.000
     * Nuevo IRP proyectado: Gs. 6.880.000
   - Muestra diferencia: +Gs. 128.572

**Resultado:**
- Usuario sabe que debe pagar aproximadamente Gs. 6,75 millones en marzo 2026
- Puede tomar decisiones: aumentar gastos deducibles, ajustar facturación
- Simulador le permite explorar escenarios "qué pasaría si..."

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Setup Inicial (1-2 días)

- [ ] Instalar Docker y Docker Compose
- [ ] Clonar repositorio
- [ ] Generar secrets seguros (JWT, Encryption Key)
- [ ] Configurar archivo .env
- [ ] Construir imágenes Docker
- [ ] Iniciar servicios
- [ ] Verificar conectividad (health checks)
- [ ] Acceder al frontend
- [ ] Login con usuario demo
- [ ] Verificar que PostgreSQL tiene datos iniciales

### Fase 2: Configuración del Sistema (1 día)

- [ ] Cambiar contraseña del usuario demo
- [ ] Actualizar datos del RUC en perfil
- [ ] Configurar credenciales de Marangatu
- [ ] Obtener API Key de la SET
- [ ] Configurar API Key en el sistema
- [ ] Configurar notificaciones por email (opcional)
- [ ] Probar validación de RUC

### Fase 3: Importación de Datos Históricos (2-3 días)

- [ ] Descargar Excel de Marangatu (año actual)
- [ ] Importar facturas recibidas
- [ ] Revisar categorización automática
- [ ] Ajustar categorías manualmente si es necesario
- [ ] Ejecutar primer scraping manual
- [ ] Verificar que no hay duplicados
- [ ] Confirmar totales en Dashboard

### Fase 4: Testing de Funcionalidades (2 días)

- [ ] Registrar transacción manual (ingreso)
- [ ] Registrar transacción manual (egreso con talonario)
- [ ] Verificar cálculo automático de IVA deducible
- [ ] Probar importación desde Excel
- [ ] Ejecutar scraping completo (emitidos + recibidos)
- [ ] Revisar historial de scraper_sessions
- [ ] Verificar cálculo de IVA mensual
- [ ] Verificar proyección de IRP anual
- [ ] Probar simulador de IRP
- [ ] Generar datos para F-120
- [ ] Generar datos para F-515
- [ ] Verificar notificaciones in-app
- [ ] Verificar emails de notificación (si configurado)
- [ ] Editar una transacción existente
- [ ] Eliminar una transacción
- [ ] Verificar audit_log

### Fase 5: Configuración de Automatización (1 día)

- [ ] Activar scraping automático
- [ ] Configurar frecuencia (semanal recomendado)
- [ ] Configurar días de alerta (7, 3, 1)
- [ ] Verificar que scheduler está corriendo
- [ ] Ver logs del scheduler
- [ ] Esperar próxima ejecución automática
- [ ] Confirmar notificación de scraping automático

### Fase 6: Producción y Mantenimiento (continuo)

- [ ] Configurar backups automáticos de PostgreSQL
- [ ] Implementar SSL/HTTPS
- [ ] Configurar firewall (solo puertos necesarios)
- [ ] Monitorear logs diariamente
- [ ] Revisar dashboard semanalmente
- [ ] Actualizar datos conocidos de proveedores
- [ ] Marcar obligaciones como pagadas
- [ ] Refresh manual de vistas MV si es necesario
- [ ] Actualizar sistema cuando haya nuevas versiones

---

## 🔐 CONSIDERACIONES DE SEGURIDAD

### Datos Sensibles Encriptados

1. **Contraseñas de usuarios:** Bcrypt con 10 rounds
2. **Credenciales de Marangatu:** AES-256-GCM
3. **Tokens JWT:** HS256 con secret rotable
4. **Variables de entorno:** Nunca en código, solo en .env

### Buenas Prácticas Implementadas

- ✅ SQL injection prevention (prepared statements)
- ✅ XSS protection (sanitización de inputs)
- ✅ CSRF tokens en formularios
- ✅ Rate limiting en API (100 req/15min)
- ✅ Session timeout (1 hora)
- ✅ Audit log completo de todas las operaciones
- ✅ Health checks para todos los servicios
- ✅ Error handling sin exponer detalles internos

### Recomendaciones Adicionales

1. **SSL/TLS:** Implementar HTTPS en producción (Let's Encrypt)
2. **Firewall:** Solo exponer puertos 80, 443 (bloquear 3001, 5432)
3. **Backups:** Automáticos diarios, retención 30 días
4. **Monitoreo:** Implementar Sentry o similar para tracking de errores
5. **2FA:** Considerar autenticación de dos factores
6. **IP Whitelist:** Limitar acceso a IPs conocidas (opcional)

---

## 📈 MÉTRICAS Y KPIs

### Métricas del Sistema

- Tiempo de respuesta API: < 200ms (promedio)
- Scraping exitoso: > 95%
- Uptime: > 99%
- Notificaciones entregadas: 100%

### KPIs Tributarios

- IVA mensual promedio
- IRP proyectado vs real (variación)
- Porcentaje de crédito fiscal recuperado
- Gastos deducibles por categoría
- Evolución de ingresos (MoM, YoY)

---

## 🛣️ ROADMAP FUTURO

### Versión 1.1 (Próximos 3 meses)

- [ ] Integración directa con API REST de FacturaSend
- [ ] Generación automática de PDFs (F-120, F-515)
- [ ] Exportación a Excel de reportes
- [ ] Múltiples usuarios por empresa
- [ ] Panel de administrador

### Versión 1.2 (6 meses)

- [ ] Integración con bancos paraguayos para pagos
- [ ] Reconocimiento OCR de facturas escaneadas
- [ ] App móvil (React Native)
- [ ] Dashboard de contador (multicliente)
- [ ] Integración con sistemas contables existentes

### Versión 2.0 (1 año)

- [ ] Soporte para IRE (empresas)
- [ ] Módulo de nómina y planillas
- [ ] Inteligencia artificial para predicciones
- [ ] API pública para terceros
- [ ] Marketplace de extensiones

---

## 📞 SOPORTE Y CONTACTO

**Documentación:** Este README + comentarios en código  
**Issues:** GitHub Issues (bugs, feature requests)  
**Email:** soporte@taxsystem.py  
**Telegram:** @taxsystem_py_support  

---

**Desarrollado con ❤️ para profesionales paraguayos**  
**Versión 1.0.0 - Octubre 2025**
