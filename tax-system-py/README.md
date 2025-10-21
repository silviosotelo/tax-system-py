# Sistema de Gestión Tributaria para Paraguay 🇵🇾

Sistema completo de gestión tributaria para profesionales independientes en Paraguay, con cálculo automático de **IVA mensual** e **IRP anual**, web scraping de Marangatu, y dashboard con gráficos y proyecciones.

## 🎯 Características Principales

### ✅ Gestión de Transacciones
- **Registro manual** de ingresos y egresos con facturas de talonario
- **Web scraping automático** de Marangatu para extraer facturas emitidas y recibidas
- **Importación masiva** desde archivos Excel descargados de Marangatu
- **Categorización automática** de gastos según Decreto 3107/2019 y 8175/2022
- **Validación en tiempo real** de RUC mediante API oficial de la SET

### 📊 Cálculo Tributario Preciso
- **IVA mensual:** Cálculo automático de débito fiscal, crédito fiscal y saldo
- **IRP anual:** Cálculo por tramos progresivos (8%, 9%, 10%) según Ley 6380/2019
- **Proyecciones:** Estimación del IRP al cierre del año fiscal
- **Deducciones:** Gestión completa de gastos deducibles para IVA e IRP

### 📈 Dashboard y Reportes
- **Vista consolidada** del estado tributario actual
- **Gráficos interactivos:** Evolución de IVA, ingresos vs egresos, distribución de gastos
- **Alertas automáticas:** Notificaciones 7, 3 y 1 día antes de cada vencimiento
- **Exportación:** Generación de datos pre-llenados para Formularios 120 (IVA) y 515 (IRP)

### 🔧 Configuración Avanzada
- **Credenciales encriptadas** para acceso a Marangatu
- **Scraping programado:** Sincronización automática semanal/mensual
- **Proveedores conocidos:** Base de datos de RUCs con categorización personalizada
- **Notificaciones por email:** Alertas de vencimientos enviadas automáticamente

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

**Frontend:**
- React 18 + TypeScript
- TailwindCSS para estilos
- Recharts para gráficos
- Axios para API calls

**Backend:**
- Node.js 20 + Express + TypeScript
- Puppeteer para web scraping
- Node-cron para jobs programados
- Winston para logging

**Base de Datos:**
- PostgreSQL 14
- Vistas materializadas para optimización
- Funciones PL/pgSQL para cálculos

**DevOps:**
- Docker Compose para orquestación
- Volúmenes persistentes para datos
- Health checks para servicios

### Estructura del Proyecto

```
tax-system-py/
├── backend/
│   ├── src/
│   │   ├── config/           # Configuración de DB, scraper, etc.
│   │   ├── controllers/      # Controladores de API
│   │   ├── services/         # Lógica de negocio
│   │   │   ├── marangatuScraper.service.ts
│   │   │   ├── calculators.service.ts (IVA e IRP)
│   │   │   ├── notification.service.ts
│   │   │   └── rucValidator.service.ts
│   │   ├── models/           # Modelos de datos
│   │   ├── jobs/             # Jobs programados
│   │   ├── middleware/       # Auth, validación, etc.
│   │   ├── routes/           # Definición de rutas
│   │   └── utils/            # Utilidades (encryption, logger)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── Transactions/
│   │   │   ├── IVA/
│   │   │   ├── IRP/
│   │   │   ├── Settings/
│   │   │   └── Shared/
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── hooks/
│   │   └── utils/
│   ├── Dockerfile
│   └── package.json
├── database/
│   └── schema.sql            # Schema completo de PostgreSQL
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- Docker 24+ y Docker Compose 2+
- Git
- 4GB RAM mínimo
- 10GB espacio en disco

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/tax-system-py.git
cd tax-system-py
```

### 2. Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
# Base de datos
DB_PASSWORD=tu_password_seguro_aqui

# JWT para autenticación
JWT_SECRET=tu_jwt_secret_de_32_caracteres_minimo

# Encryption para credenciales Marangatu
ENCRYPTION_KEY=tu_encryption_key_de_32_caracteres

# Email (opcional, para notificaciones)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_app_password
EMAIL_FROM=noreply@taxsystem.py

# Entorno
NODE_ENV=production
API_URL=http://localhost:3001/api
```

**⚠️ IMPORTANTE:** Genera claves seguras para JWT_SECRET y ENCRYPTION_KEY:

```bash
# Generar JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generar ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Levantar los Servicios

```bash
# Construcción de imágenes
docker-compose build

# Iniciar todos los servicios
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Solo backend y postgres
docker-compose up -d postgres backend

# Incluir PgAdmin (para desarrollo)
docker-compose --profile dev up -d
```

### 4. Verificar Instalación

```bash
# Check de servicios
docker-compose ps

# Debería mostrar:
# - postgres (puerto 5432) - healthy
# - backend (puerto 3001) - running
# - frontend (puerto 3000) - running
# - scheduler - running

# Verificar logs del backend
docker-compose logs backend

# Test de conectividad
curl http://localhost:3001/api/health
```

### 5. Acceso a la Aplicación

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api
- **PgAdmin (dev):** http://localhost:5050

**Credenciales iniciales:**
- Email: `demo@taxsystem.py`
- Password: `demo123456`
- RUC: `4895448-9`

## 📘 Uso del Sistema

### Configuración Inicial

1. **Acceder al sistema** con las credenciales demo o crear tu cuenta
2. **Ir a Configuración** (⚙️)
3. **Configurar credenciales de Marangatu:**
   - Usuario de Marangatu
   - Clave de Acceso Confidencial (se encripta automáticamente)
4. **Configurar API Key de la SET** (opcional, para validación de RUC):
   - Obtener desde Marangatu → Comunicar Uso De Consultas Públicas
   - Copiar el APIKEY enviado al buzón MARANDU
5. **Guardar configuración**

### Registro Manual de Transacciones

1. **Ir a "Transacciones"**
2. **Click en "+ Nueva Transacción"**
3. **Completar formulario:**
   - Fecha de la transacción
   - Tipo: Ingreso (factura emitida) o Egreso (gasto)
   - RUC del proveedor/cliente (valida automáticamente)
   - Número de factura
   - Monto total con IVA
   - Categoría de deducción (para egresos)
4. **Guardar** → El sistema calcula automáticamente IVA deducible

### Web Scraping de Marangatu

#### Scraping Manual (On-Demand)

1. **Ir a "Configuración" → "Web Scraping"**
2. **Click en "Ejecutar Scraping Ahora"**
3. **Seleccionar opciones:**
   - Tipo: Facturas emitidas, recibidas, o ambas
   - Período: Desde - Hasta (fechas)
4. **Iniciar** → El proceso toma 2-5 minutos
5. **Revisar resultados:**
   - Total encontrado
   - Total importado
   - Errores (si hay)

#### Scraping Automático (Programado)

1. **Ir a "Configuración" → "Web Scraping"**
2. **Activar "Scraping Automático"**
3. **Seleccionar frecuencia:**
   - Diario
   - Semanal (recomendado)
   - Mensual
4. **Guardar** → El scheduler ejecutará automáticamente

**⚠️ Nota:** El scraping puede fallar si:
- Las credenciales de Marangatu son incorrectas
- La SET cambia la estructura del sitio
- Hay problemas de conectividad

### Importación desde Excel

1. **Descargar Excel desde Marangatu:**
   - Ingresar a Marangatu manualmente
   - Ir a Declaraciones Informativas → Compras a Imputar
   - Descargar archivo Excel
2. **En el sistema, ir a "Transacciones"**
3. **Click en "📥 Importar Excel"**
4. **Seleccionar archivo descargado**
5. **Confirmar importación** → Revisa duplicados automáticamente

### Cálculo de IVA Mensual

1. **Ir a "IVA" → "Mes Actual"**
2. **Ver resumen automático:**
   - Débito Fiscal (IVA cobrado en ventas)
   - Crédito Fiscal (IVA deducible en compras)
   - Saldo a Pagar
3. **Click en "Generar F-120"** → Obtiene datos pre-llenados
4. **Copiar datos a Marangatu** para presentar declaración oficial
5. **Marcar como "Pagado"** una vez presentado

### Proyección de IRP Anual

1. **Ir a "IRP" → "Año Actual"**
2. **Ver proyección:**
   - Ingresos brutos acumulados
   - Gastos deducibles acumulados
   - Renta neta
   - IRP proyectado al cierre del año (por tramos)
3. **Usar simulador:**
   - Modificar ingresos/gastos proyectados
   - Ver impacto en IRP final
4. **En marzo, generar F-515** con todos los datos del año anterior

### Notificaciones y Alertas

El sistema genera automáticamente:
- **7 días antes:** Alerta amarilla de próximo vencimiento
- **3 días antes:** Alerta naranja de vencimiento cercano
- **1 día antes:** Alerta roja de vencimiento inminente

Las notificaciones aparecen en:
- Dashboard principal
- Centro de notificaciones (campana 🔔)
- Email (si está configurado)

## 🔍 Normativa Tributaria Aplicada

### IVA (Impuesto al Valor Agregado)

**Marco legal:** Ley 6380/2019 (Libro II), Decreto 3107/2019, Decreto 8175/2022

- **Tasa general:** 10%
- **Liquidación:** Mensual por declaración jurada (F-120)
- **Vencimiento:** Día 25 del mes siguiente (según terminación de RUC)
- **Crédito fiscal deducible:**
  - 100%: Oficina exclusiva, salud, capacitación, equipos, publicidad
  - 50%: Servicios públicos mixtos, arrendamiento mixto
  - 30%: Alimentos, compra de vehículo

### IRP (Impuesto a la Renta Personal)

**Marco legal:** Ley 6380/2019 (Libro I, Título III), Decreto 3184/2019

- **Régimen:** IRP-RSP (Rentas de Servicios Personales)
- **Base imponible:** Renta neta (ingresos - gastos deducibles)
- **Tasas progresivas:**
  - 8% sobre los primeros Gs. 50.000.000
  - 9% de Gs. 50.000.001 a Gs. 150.000.000
  - 10% sobre montos superiores a Gs. 150.000.000
- **Declaración:** Anual en marzo (F-515)
- **NO hay anticipos mensuales** (solo retenciones si aplican)
- **Umbral de inscripción:** Gs. 80.000.000 anuales

### Deducciones IRP Permitidas

**Gastos de la actividad:**
- Insumos, materiales, útiles de oficina
- Equipamiento informático y mobiliario
- Construcción o refacción de oficina
- Salud, capacitación, vestimenta profesional

**Gastos personales y familiares:**
- Alimentación documentada
- Arrendamiento de vivienda
- Educación y salud (sin límite)
- Aportes IPS o sistemas privados
- Autovehículo (cada 3 años)
- Inmueble para vivienda (cada 5 años)

## 🔐 Seguridad

### Encriptación de Datos Sensibles

- **Contraseñas de usuarios:** Bcrypt con 10 rounds
- **Credenciales de Marangatu:** AES-256-GCM encryption
- **Tokens JWT:** Firma con algoritmo HS256
- **Comunicación:** HTTPS obligatorio en producción

### Auditoría

Todas las operaciones se registran en `audit_log`:
- Usuario que ejecutó la acción
- Timestamp preciso
- Valores antiguos y nuevos (para updates)
- IP address y user agent

### Backups

**Recomendaciones:**

```bash
# Backup manual de PostgreSQL
docker-compose exec postgres pg_dump -U taxuser tax_system_py > backup.sql

# Restore
docker-compose exec -T postgres psql -U taxuser tax_system_py < backup.sql

# Backup automatizado (agregar a crontab)
0 2 * * * cd /path/to/tax-system-py && ./scripts/backup.sh
```

## 🐛 Troubleshooting

### El scraping falla constantemente

**Posibles causas:**
1. Credenciales incorrectas → Verificar en Marangatu manualmente
2. SET cambió estructura del sitio → Requiere actualización del código
3. Timeout de red → Aumentar `timeout` en `marangatuScraper.service.ts`

**Solución temporal:** Usar importación manual desde Excel

### Error de conexión a PostgreSQL

```bash
# Verificar que postgres esté corriendo
docker-compose ps postgres

# Ver logs de postgres
docker-compose logs postgres

# Reiniciar solo postgres
docker-compose restart postgres
```

### Frontend no muestra datos

```bash
# Verificar que backend esté respondiendo
curl http://localhost:3001/api/health

# Ver logs del backend
docker-compose logs backend

# Verificar variable REACT_APP_API_URL
docker-compose exec frontend env | grep API
```

### Jobs de notificaciones no se ejecutan

```bash
# Verificar que scheduler esté corriendo
docker-compose ps scheduler

# Ver logs del scheduler
docker-compose logs scheduler

# Reiniciar scheduler
docker-compose restart scheduler
```

## 📦 Actualización del Sistema

```bash
# Detener servicios
docker-compose down

# Actualizar código (git pull o descargar nueva versión)
git pull origin main

# Reconstruir imágenes
docker-compose build --no-cache

# Aplicar migraciones de BD si hay
docker-compose exec postgres psql -U taxuser tax_system_py < database/migrations/001-update.sql

# Reiniciar servicios
docker-compose up -d

# Verificar logs
docker-compose logs -f
```

## 🤝 Contribuciones

Este es un proyecto de código abierto. Contribuciones bienvenidas:

1. Fork del repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'Agregar nueva funcionalidad'`
4. Push al branch: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles

## 📞 Soporte

- **Issues:** https://github.com/tu-usuario/tax-system-py/issues
- **Email:** soporte@taxsystem.py
- **Documentación:** https://docs.taxsystem.py

---

**Desarrollado con ❤️ para profesionales independientes en Paraguay** 🇵🇾

**Versión:** 1.0.0  
**Última actualización:** Octubre 2025
