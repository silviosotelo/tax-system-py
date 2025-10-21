/**
 * SERVICIOS DE CÁLCULO TRIBUTARIO
 * 
 * Implementa la lógica de cálculo de IVA e IRP según:
 * - Ley 6380/2019
 * - Decreto 3107/2019 y modificatorias
 * - Decreto 3184/2019
 */

import { Pool } from 'pg';
import logger from '../utils/logger';

interface IVACalculationResult {
  period: Date;
  debitoFiscal: number;
  creditoFiscal: number;
  saldoIVA: number;
  totalIngresos: number;
  totalEgresos: number;
  qtyIngresos: number;
  qtyEgresos: number;
  detalleDebito: TransactionSummary[];
  detalleCredito: TransactionSummary[];
}

interface TransactionSummary {
  date: Date;
  documentNumber: string;
  counterpart: string;
  amount: number;
  iva: number;
}

export class IVACalculatorService {
  constructor(private db: Pool) {}

  /**
   * Calcula IVA mensual para un usuario y período
   */
  async calculateMonthlyIVA(
    userId: string,
    year: number,
    month: number
  ): Promise<IVACalculationResult> {
    try {
      logger.info(`Calculando IVA para período ${month}/${year}`);

      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0);

      // Consulta principal con JOIN a deduction_categories
      const query = `
        SELECT 
          t.type,
          t.transaction_date,
          t.document_number,
          t.name_counterpart,
          t.gross_amount,
          t.iva_amount,
          t.creditable_iva_amount,
          t.is_creditable_iva,
          t.iva_deduction_category,
          dc.name as category_name
        FROM transactions t
        LEFT JOIN deduction_categories dc ON t.iva_deduction_category = dc.code
        WHERE t.user_id = $1
          AND t.transaction_date >= $2
          AND t.transaction_date <= $3
          AND t.status = 'REGISTERED'
        ORDER BY t.transaction_date, t.type
      `;

      const result = await this.db.query(query, [userId, periodStart, periodEnd]);

      // Inicializar resultado
      const calculation: IVACalculationResult = {
        period: periodStart,
        debitoFiscal: 0,
        creditoFiscal: 0,
        saldoIVA: 0,
        totalIngresos: 0,
        totalEgresos: 0,
        qtyIngresos: 0,
        qtyEgresos: 0,
        detalleDebito: [],
        detalleCredito: []
      };

      // Procesar transacciones
      for (const row of result.rows) {
        if (row.type === 'INGRESO') {
          // DÉBITO FISCAL (IVA cobrado en ventas)
          calculation.debitoFiscal += parseFloat(row.iva_amount);
          calculation.totalIngresos += parseFloat(row.gross_amount);
          calculation.qtyIngresos++;

          calculation.detalleDebito.push({
            date: row.transaction_date,
            documentNumber: row.document_number,
            counterpart: row.name_counterpart,
            amount: parseFloat(row.gross_amount),
            iva: parseFloat(row.iva_amount)
          });

        } else if (row.type === 'EGRESO' && row.is_creditable_iva) {
          // CRÉDITO FISCAL (IVA deducible en compras)
          calculation.creditoFiscal += parseFloat(row.creditable_iva_amount);
          calculation.totalEgresos += parseFloat(row.gross_amount);
          calculation.qtyEgresos++;

          calculation.detalleCredito.push({
            date: row.transaction_date,
            documentNumber: row.document_number,
            counterpart: row.name_counterpart,
            amount: parseFloat(row.gross_amount),
            iva: parseFloat(row.creditable_iva_amount)
          });
        }
      }

      // Calcular saldo
      calculation.saldoIVA = calculation.debitoFiscal - calculation.creditoFiscal;

      logger.info(
        `IVA calculado: Débito=${calculation.debitoFiscal}, ` +
        `Crédito=${calculation.creditoFiscal}, Saldo=${calculation.saldoIVA}`
      );

      return calculation;

    } catch (error) {
      logger.error('Error al calcular IVA:', error);
      throw error;
    }
  }

  /**
   * Obtiene evolución de IVA últimos N meses
   */
  async getIVATrend(userId: string, months: number = 12): Promise<{
    period: string;
    debitoFiscal: number;
    creditoFiscal: number;
    saldoIVA: number;
  }[]> {
    try {
      const query = `
        SELECT 
          TO_CHAR(period, 'YYYY-MM') as period,
          debito_fiscal,
          credito_fiscal,
          saldo_iva
        FROM mv_monthly_iva_summary
        WHERE user_id = $1
          AND period >= CURRENT_DATE - INTERVAL '${months} months'
        ORDER BY period
      `;

      const result = await this.db.query(query, [userId]);

      return result.rows.map(row => ({
        period: row.period,
        debitoFiscal: parseFloat(row.debito_fiscal),
        creditoFiscal: parseFloat(row.credito_fiscal),
        saldoIVA: parseFloat(row.saldo_iva)
      }));

    } catch (error) {
      logger.error('Error al obtener tendencia IVA:', error);
      throw error;
    }
  }

  /**
   * Genera datos pre-llenados para Formulario 120
   */
  async generateForm120Data(
    userId: string,
    year: number,
    month: number
  ): Promise<{
    rubro1: { ventas: number; ivaDebito: number };
    rubro3: { compras: number; ivaCredito: number; comprasDetail: any[] };
    rubro4: { debitoFiscal: number; creditoFiscal: number; saldoAPagar: number };
  }> {
    const calculation = await this.calculateMonthlyIVA(userId, year, month);

    return {
      rubro1: {
        ventas: calculation.totalIngresos,
        ivaDebito: calculation.debitoFiscal
      },
      rubro3: {
        compras: calculation.totalEgresos,
        ivaCredito: calculation.creditoFiscal,
        comprasDetail: calculation.detalleCredito.map(d => ({
          fecha: d.date,
          proveedor: d.counterpart,
          factura: d.documentNumber,
          monto: d.amount,
          iva: d.iva
        }))
      },
      rubro4: {
        debitoFiscal: calculation.debitoFiscal,
        creditoFiscal: calculation.creditoFiscal,
        saldoAPagar: Math.max(0, calculation.saldoIVA)
      }
    };
  }
}

export { IVACalculationResult };