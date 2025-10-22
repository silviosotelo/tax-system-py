# 📥 GUÍA: Descargar Comprobantes desde Marangatu SET

## Opción 1: Scraping Automático (Recomendado)

El sistema tiene **web scraping integrado** que descarga automáticamente tus comprobantes desde Marangatu.

### Paso 1: Configurar Credenciales

1. Accede al sistema: http://localhost:3000
2. Ve a **Configuración** (menú superior)
3. En la sección "Credenciales Marangatu":
   - **Usuario**: Tu RUC (ejemplo: 4895448-9)
   - **Clave**: Tu Clave de Acceso Confidencial de Marangatu
4. Haz clic en **Guardar Configuración**

### Paso 2: Ejecutar Scraping Manual

Puedes ejecutar el scraping desde la API o configurar el scraping automático:

#### Opción A: Ejecutar desde la API (Postman/cURL)

```bash
curl -X POST http://localhost:3001/api/scraper/execute \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "BOTH",
    "periodFrom": "2024-01-01",
    "periodTo": "2024-12-31"
  }'
```

Tipos de scraping disponibles:
- `"BOTH"` - Compras y ventas
- `"PURCHASE"` - Solo compras
- `"SALE"` - Solo ventas

#### Opción B: Habilitar Scraping Automático

1. Ve a **Configuración**
2. Activa "Activar scraping automático"
3. Selecciona frecuencia:
   - **Diario** - Todos los días
   - **Semanal** - Cada lunes a las 2:00 AM (por defecto)
   - **Mensual** - Primer día del mes

El sistema ejecutará el scraping automáticamente y creará las transacciones.

---

## Opción 2: Descarga Manual desde Marangatu

Si prefieres descargar manualmente desde Marangatu:

### Paso 1: Acceder a Marangatu

1. Ve a: https://marangatu.set.gov.py
2. Ingresa con tu RUC y Clave de Acceso Confidencial

### Paso 2: Descargar Comprobantes Electrónicos Recibidos

**Para COMPRAS (Gastos/Egresos):**

1. En el menú, ve a: **Comprobantes Electrónicos** → **Recibidos**
2. Selecciona el período (mes/año)
3. Haz clic en **Buscar**
4. En los resultados, haz clic en **Exportar** o **Descargar**
5. Elige formato **Excel** o **CSV**
6. Guarda el archivo (ejemplo: `compras_enero_2024.xlsx`)

**Para VENTAS (Ingresos):**

1. En el menú, ve a: **Comprobantes Electrónicos** → **Emitidos**
2. Selecciona el período
3. Buscar y Exportar a Excel/CSV
4. Guarda el archivo (ejemplo: `ventas_enero_2024.xlsx`)

### Paso 3: Importar al Sistema

**Opción A: Importación Manual (Crear transacciones una por una)**

Usa el módulo de **Transacciones** en el sistema:
1. Ve a http://localhost:3000/transactions
2. Haz clic en **Nueva Transacción**
3. Ingresa los datos de cada comprobante:
   - Tipo (INGRESO/EGRESO)
   - Fecha
   - RUC del proveedor/cliente
   - Timbrado
   - Número de factura
   - Monto
   - IVA

**Opción B: Importación Masiva (Script)**

Puedes crear un script para importar desde Excel/CSV:

```javascript
// script-importar-comprobantes.js
const XLSX = require('xlsx');
const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const TOKEN = 'TU_TOKEN_JWT'; // Obtener del login

async function importarComprobantes(archivoExcel) {
  // Leer archivo Excel
  const workbook = XLSX.readFile(archivoExcel);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  // Importar cada comprobante
  for (const row of data) {
    const transaction = {
      type: row.Tipo === 'Emitido' ? 'INGRESO' : 'EGRESO',
      transaction_date: row.Fecha,
      ruc: row.RUC,
      timbrado: row.Timbrado,
      invoice_number: row.Numero,
      gross_amount: row.Total,
      iva_amount: row.IVA,
      description: row.Razon_Social,
      invoice_type: row.Tipo_Comprobante
    };

    try {
      await axios.post(`${API_URL}/transactions`, transaction, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });
      console.log(`✓ Importado: ${row.Numero}`);
    } catch (error) {
      console.error(`✗ Error: ${row.Numero}`, error.message);
    }
  }
}

// Ejecutar
importarComprobantes('./compras_enero_2024.xlsx');
```

Ejecutar:
```bash
npm install xlsx axios
node script-importar-comprobantes.js
```

---

## Opción 3: API REST Directa

También puedes usar la API REST directamente:

### Crear Transacción Individual

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "EGRESO",
    "transaction_date": "2024-10-15",
    "ruc": "80016875-5",
    "timbrado": "12345678",
    "invoice_number": "001-001-0001234",
    "gross_amount": 1100000,
    "iva_amount": 100000,
    "description": "Compra de suministros",
    "invoice_type": "FACTURA"
  }'
```

---

## ⚙️ Formato de Datos Marangatu

Los archivos descargados de Marangatu típicamente incluyen:

### Comprobantes Recibidos (Compras)
- **RUC Emisor**: RUC del proveedor
- **Razón Social**: Nombre del proveedor
- **Timbrado**: Número de timbrado
- **Número**: Número de factura (001-001-0001234)
- **Fecha**: Fecha de emisión
- **Tipo Comprobante**: Factura, Autofactura, etc.
- **Total**: Monto total
- **IVA 10%**: IVA incluido
- **Gravado 10%**: Base imponible
- **Exentas**: Monto exento
- **Estado**: Vigente, Cancelado

### Comprobantes Emitidos (Ventas)
- Similar estructura pero desde tu perspectiva como emisor

---

## 📊 Mapeo de Campos

Al importar, mapea los campos así:

| Campo Marangatu | Campo Sistema | Ejemplo |
|-----------------|---------------|---------|
| RUC Emisor/Receptor | `ruc` | "80016875-5" |
| Timbrado | `timbrado` | "12345678" |
| Número | `invoice_number` | "001-001-0001234" |
| Fecha | `transaction_date` | "2024-10-15" |
| Total | `gross_amount` | 1100000 |
| IVA 10% | `iva_amount` | 100000 |
| Tipo | `type` | "INGRESO" o "EGRESO" |
| Tipo Comprobante | `invoice_type` | "FACTURA" |
| Razón Social | `description` | Nombre proveedor |

---

## 🤖 Scraping Automático - Funcionamiento

El sistema usa **Puppeteer** para:

1. Iniciar sesión en Marangatu con tus credenciales encriptadas
2. Navegar a "Comprobantes Electrónicos"
3. Extraer datos de comprobantes recibidos y emitidos
4. Detectar duplicados (evita reimportar)
5. Crear transacciones automáticamente
6. Registrar log de la sesión de scraping

### Verificar Estado del Scraping

```bash
# Ver historial de scraping
curl http://localhost:3001/api/scraper/history \
  -H "Authorization: Bearer TU_TOKEN"

# Ver sesión específica
curl http://localhost:3001/api/scraper/session/SESSION_ID \
  -H "Authorization: Bearer TU_TOKEN"
```

---

## 🔒 Seguridad

- ✅ Credenciales encriptadas con **AES-256-GCM**
- ✅ Nunca se guardan en texto plano
- ✅ Solo el usuario puede ver sus transacciones
- ✅ Logs de auditoría completos

---

## ⚠️ Notas Importantes

1. **RUC**: Marangatu usa tu RUC como usuario
2. **Clave CAC**: Es la Clave de Acceso Confidencial (NO es tu password de SET)
3. **Duplicados**: El sistema detecta automáticamente facturas duplicadas
4. **Validación RUC**: El sistema valida RUCs con la API de la SET
5. **Período**: Puedes importar hasta 12 meses de comprobantes

---

## 🆘 Solución de Problemas

### Error: "Credenciales inválidas"
- Verifica tu RUC (formato: 12345678-9)
- Confirma tu Clave de Acceso Confidencial
- Intenta ingresar manualmente en Marangatu primero

### Error: "Timeout en scraping"
- Marangatu puede estar lento
- Intenta con un período más corto
- Ejecuta el scraping en horarios de baja demanda

### Error: "No se encontraron comprobantes"
- Verifica el período seleccionado
- Confirma que tienes comprobantes en ese período en Marangatu

---

## 📞 Contacto Marangatu SET

- **Web**: https://marangatu.set.gov.py
- **Helpdesk SET**: (021) 414-2000
- **Horario**: Lunes a Viernes 07:00 - 19:00

---

## 🎯 Recomendación

Para mayor comodidad, usa el **scraping automático semanal**:

1. Configura tus credenciales una sola vez
2. Activa el scraping automático semanal
3. El sistema importará automáticamente cada lunes
4. Solo revisa y confirma las transacciones

**¡El sistema hace todo el trabajo por ti!** 🚀
