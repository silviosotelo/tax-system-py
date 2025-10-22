/**
 * Script para importar comprobantes desde Excel descargado de Marangatu
 *
 * Uso:
 *   1. npm install xlsx axios
 *   2. node scripts/importar-desde-excel.js <archivo.xlsx> <token-jwt>
 *
 * Ejemplo:
 *   node scripts/importar-desde-excel.js compras_enero_2024.xlsx eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

const XLSX = require('xlsx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:3001/api';

// Función para limpiar y formatear RUC
function formatRUC(ruc) {
  if (!ruc) return null;
  return ruc.toString().trim().replace(/\s+/g, '');
}

// Función para formatear fecha
function formatDate(date) {
  if (!date) return null;

  // Si es un número de serie de Excel
  if (typeof date === 'number') {
    const excelDate = new Date((date - 25569) * 86400 * 1000);
    return excelDate.toISOString().split('T')[0];
  }

  // Si es string, intentar parsear
  if (typeof date === 'string') {
    const parts = date.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return null;
}

// Función para limpiar monto
function formatAmount(amount) {
  if (!amount) return 0;

  // Convertir a string y limpiar
  const cleaned = amount.toString()
    .replace(/[^\d.,]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  return parseFloat(cleaned) || 0;
}

// Mapeo de columnas (ajustar según tu archivo de Marangatu)
const COLUMN_MAP = {
  // Opciones comunes de nombres de columnas en Marangatu
  ruc: ['RUC', 'RUC Emisor', 'RUC Receptor', 'Ruc', 'ruc'],
  razonSocial: ['Razón Social', 'Razon Social', 'Nombre', 'razonSocial'],
  timbrado: ['Timbrado', 'timbrado', 'Nro. Timbrado'],
  numero: ['Número', 'Numero', 'Nro. Comprobante', 'numero', 'Nro Factura'],
  fecha: ['Fecha', 'Fecha Emisión', 'fecha', 'Fecha Emision'],
  tipoComprobante: ['Tipo Comprobante', 'Tipo', 'tipo', 'tipoComprobante'],
  total: ['Total', 'Monto Total', 'total', 'Importe Total'],
  iva: ['IVA 10%', 'IVA', 'iva', 'Iva 10', 'IVA 10'],
  gravado: ['Gravado 10%', 'Gravadas 10%', 'Base Imponible', 'gravado'],
  exentas: ['Exentas', 'exentas', 'Monto Exento']
};

// Función para encontrar el nombre correcto de la columna
function findColumn(row, possibleNames) {
  for (const name of possibleNames) {
    if (row.hasOwnProperty(name)) {
      return name;
    }
  }
  return null;
}

// Función principal de importación
async function importarComprobantes(archivoExcel, token, tipo = 'EGRESO') {
  console.log('🚀 Iniciando importación...\n');

  // Validar archivo
  if (!fs.existsSync(archivoExcel)) {
    console.error('❌ Error: Archivo no encontrado:', archivoExcel);
    process.exit(1);
  }

  // Leer archivo Excel
  console.log('📖 Leyendo archivo:', archivoExcel);
  const workbook = XLSX.readFile(archivoExcel);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`📊 Total de registros encontrados: ${data.length}\n`);

  if (data.length === 0) {
    console.log('⚠️  No se encontraron datos en el archivo');
    return;
  }

  // Estadísticas
  let importados = 0;
  let errores = 0;
  const errorLog = [];

  // Procesar cada fila
  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    try {
      // Encontrar columnas
      const colRUC = findColumn(row, COLUMN_MAP.ruc);
      const colRazonSocial = findColumn(row, COLUMN_MAP.razonSocial);
      const colTimbrado = findColumn(row, COLUMN_MAP.timbrado);
      const colNumero = findColumn(row, COLUMN_MAP.numero);
      const colFecha = findColumn(row, COLUMN_MAP.fecha);
      const colTipo = findColumn(row, COLUMN_MAP.tipoComprobante);
      const colTotal = findColumn(row, COLUMN_MAP.total);
      const colIVA = findColumn(row, COLUMN_MAP.iva);

      // Extraer datos
      const ruc = formatRUC(row[colRUC]);
      const razonSocial = row[colRazonSocial] || '';
      const timbrado = row[colTimbrado] ? row[colTimbrado].toString() : '';
      const numero = row[colNumero] ? row[colNumero].toString() : '';
      const fecha = formatDate(row[colFecha]);
      const tipoComprobante = row[colTipo] || 'FACTURA';
      const total = formatAmount(row[colTotal]);
      const iva = formatAmount(row[colIVA]);

      // Validar datos mínimos
      if (!ruc || !fecha || total <= 0) {
        console.log(`⚠️  Fila ${i + 1}: Datos incompletos, omitiendo...`);
        continue;
      }

      // Crear objeto de transacción
      const transaction = {
        type: tipo,
        transaction_date: fecha,
        ruc: ruc,
        timbrado: timbrado,
        invoice_number: numero,
        gross_amount: Math.round(total),
        iva_amount: Math.round(iva),
        description: razonSocial,
        invoice_type: tipoComprobante
      };

      // Enviar a la API
      await axios.post(`${API_URL}/transactions`, transaction, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      importados++;
      console.log(`✓ [${i + 1}/${data.length}] ${numero} - ${razonSocial.substring(0, 30)} - Gs. ${total.toLocaleString()}`);

    } catch (error) {
      errores++;
      const mensaje = error.response?.data?.error || error.message;
      errorLog.push({
        fila: i + 1,
        numero: row[findColumn(row, COLUMN_MAP.numero)],
        error: mensaje
      });
      console.error(`✗ [${i + 1}/${data.length}] Error: ${mensaje}`);
    }

    // Pequeña pausa para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE IMPORTACIÓN');
  console.log('='.repeat(60));
  console.log(`✓ Importados exitosamente: ${importados}`);
  console.log(`✗ Errores: ${errores}`);
  console.log(`📄 Total procesados: ${importados + errores}`);
  console.log('='.repeat(60) + '\n');

  // Guardar log de errores si hay
  if (errorLog.length > 0) {
    const logFile = `importacion_errores_${Date.now()}.json`;
    fs.writeFileSync(logFile, JSON.stringify(errorLog, null, 2));
    console.log(`⚠️  Log de errores guardado en: ${logFile}\n`);
  }
}

// Ejecutar script
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
📥 Script de Importación de Comprobantes desde Excel

Uso:
  node importar-desde-excel.js <archivo.xlsx> <token-jwt> [tipo]

Argumentos:
  archivo.xlsx  - Ruta al archivo Excel descargado de Marangatu
  token-jwt     - Token JWT obtenido del login
  tipo          - Opcional: "INGRESO" o "EGRESO" (default: EGRESO)

Ejemplos:
  node importar-desde-excel.js compras_enero.xlsx eyJhbGc... EGRESO
  node importar-desde-excel.js ventas_enero.xlsx eyJhbGc... INGRESO

Obtener token JWT:
  1. Haz login en el sistema
  2. Abre DevTools (F12) → Console
  3. Ejecuta: localStorage.getItem('token')
  4. Copia el token (sin comillas)
  `);
  process.exit(0);
}

const [archivo, token, tipo] = args;
const tipoTransaccion = (tipo || 'EGRESO').toUpperCase();

if (!['INGRESO', 'EGRESO'].includes(tipoTransaccion)) {
  console.error('❌ Error: Tipo debe ser "INGRESO" o "EGRESO"');
  process.exit(1);
}

// Iniciar importación
importarComprobantes(archivo, token, tipoTransaccion)
  .then(() => {
    console.log('✅ Importación completada\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  });
