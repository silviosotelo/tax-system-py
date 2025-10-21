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

interface IRPCalculationResult {
  fiscalYear: number;
  grossIncome: number;
  deductibleExpenses: number;
  netIncome: number;
  tramo1: { base: number; rate: number; tax: number };
  tramo2: { base: number; rate: number; tax: number };
  tramo3: { base: number; rate: number; tax: number };
  totalTax: number;
  withholdings: number;
  taxToPay: number;
  expensesByCategory: { [category: string]: number };
}

export class IRPCalculatorService {
  constructor(private db: Pool) {}

  /**
   * Calcula IRP anual según tramos progresivos (Art. 69 Ley 6380/2019)
   */
  calculateIRPByTramos(netIncome: number): {
    tramo1: { base: number; rate: number; tax: number };
    tramo2: { base: number; rate: number; tax: number };
    tramo3: { base: number; rate: number; tax: number };
    totalTax: number;
  } {
    const TRAMO1_LIMIT = 50000000; // Gs. 50.000.000
    const TRAMO2_LIMIT = 150000000; // Gs. 150.000.000

    // Tramo 1: hasta Gs. 50.000.000 al 8%
    const tramo1Base = Math.min(netIncome, TRAMO1_LIMIT);
    const tramo1Tax = tramo1Base * 0.08;

    // Tramo 2: de Gs. 50.000.001 a Gs. 150.000.000 al 9%
    let tramo2Base = 0;
    let tramo2Tax = 0;
    if (netIncome > TRAMO1_LIMIT) {
      tramo2Base = Math.min(netIncome - TRAMO1_LIMIT, TRAMO2_LIMIT - TRAMO1_LIMIT);
      tramo2Tax = tramo2Base * 0.09;
    }

    // Tramo 3: más de Gs. 150.000.000 al 10%
    let tramo3Base = 0;
    let tramo3Tax = 0;
    if (netIncome > TRAMO2_LIMIT) {
      tramo3Base = netIncome - TRAMO2_LIMIT;
      tramo3Tax = tramo3Base * 0.10;
    }

    const totalTax = tramo1Tax + tramo2Tax + tramo3Tax;

    return {
      tramo1: { base: tramo1Base, rate: 8, tax: tramo1Tax },
      tramo2: { base: tramo2Base, rate: 9, tax: tramo2Tax },
      tramo3: { base: tramo3Base, rate: 10, tax: tramo3Tax },
      totalTax
    };
  }

  /**
   * Calcula IRP anual completo
   */
  async calculateAnnualIRP(
    userId: string,
    fiscalYear: number
  ): Promise<IRPCalculationResult> {
    try {
      logger.info(`Calculando IRP para ejercicio fiscal ${fiscalYear}`);

      const yearStart = new Date(fiscalYear, 0, 1);
      const yearEnd = new Date(fiscalYear, 11, 31);

      // Consulta de ingresos y gastos
      const query = `
        SELECT 
          SUM(CASE WHEN type = 'INGRESO' THEN net_amount ELSE 0 END) as gross_income,
          SUM(CASE WHEN type = 'EGRESO' AND is_deductible_irp = true 
              THEN net_amount ELSE 0 END) as deductible_expenses,
          jsonb_object_agg(
            COALESCE(irp_deduction_category, 'sin_categorizar'), 
            SUM(CASE WHEN type = 'EGRESO' AND is_deductible_irp = true 
                THEN net_amount ELSE 0 END)
          ) FILTER (WHERE type = 'EGRESO' AND is_deductible_irp = true) as expenses_by_category
        FROM transactions
        WHERE user_id = $1
          AND transaction_date >= $2
          AND transaction_date <= $3
          AND status = 'REGISTERED'
      `;

      const result = await this.db.query(query, [userId, yearStart, yearEnd]);
      const row = result.rows[0];

      const grossIncome = parseFloat(row.gross_income) || 0;
      const deductibleExpenses = parseFloat(row.deductible_expenses) || 0;
      const netIncome = grossIncome - deductibleExpenses;

      // Calcular impuesto por tramos
      const tramoCalculation = this.calculateIRPByTramos(netIncome);

      // Consultar retenciones
      const withholdingsQuery = `
        SELECT COALESCE(SUM(withholdings_amount), 0) as total_withholdings
        FROM tax_obligations
        WHERE user_id = $1
          AND tax_type = 'IRP'
          AND fiscal_period = $2
      `;

      const withholdingsResult = await this.db.query(withholdingsQuery, [
        userId,
        yearStart
      ]);

      const withholdings = parseFloat(withholdingsResult.rows[0].total_withholdings) || 0;

      const calculation: IRPCalculationResult = {
        fiscalYear,
        grossIncome,
        deductibleExpenses,
        netIncome,
        ...tramoCalculation,
        withholdings,
        taxToPay: Math.max(0, tramoCalculation.totalTax - withholdings),
        expensesByCategory: row.expenses_by_category || {}
      };

      logger.info(
        `IRP calculado: Renta Neta=${netIncome}, ` +
        `Impuesto Total=${tramoCalculation.totalTax}, ` +
        `Retenciones=${withholdings}, A Pagar=${calculation.taxToPay}`
      );

      return calculation;

    } catch (error) {
      logger.error('Error al calcular IRP:', error);
      throw error;
    }
  }

  /**
   * Proyecta IRP al final del año basándose en meses transcurridos
   */
  async projectAnnualIRP(
    userId: string,
    fiscalYear: number,
    currentMonth: number
  ): Promise<{
    actual: IRPCalculationResult;
    projected: IRPCalculationResult;
    monthsElapsed: number;
    monthsRemaining: number;
  }> {
    // Calcular IRP hasta el mes actual
    const actualCalculation = await this.calculateAnnualIRP(userId, fiscalYear);

    // Proyectar al cierre del año
    const monthsElapsed = currentMonth;
    const monthsRemaining = 12 - monthsElapsed;

    const avgMonthlyIncome = actualCalculation.grossIncome / monthsElapsed;
    const avgMonthlyExpenses = actualCalculation.deductibleExpenses / monthsElapsed;

    const projectedGrossIncome = 
      actualCalculation.grossIncome + (avgMonthlyIncome * monthsRemaining);
    const projectedExpenses = 
      actualCalculation.deductibleExpenses + (avgMonthlyExpenses * monthsRemaining);
    const projectedNetIncome = projectedGrossIncome - projectedExpenses;

    const projectedTramos = this.calculateIRPByTramos(projectedNetIncome);

    const projectedCalculation: IRPCalculationResult = {
      fiscalYear,
      grossIncome: projectedGrossIncome,
      deductibleExpenses: projectedExpenses,
      netIncome: projectedNetIncome,
      ...projectedTramos,
      withholdings: actualCalculation.withholdings,
      taxToPay: Math.max(0, projectedTramos.totalTax - actualCalculation.withholdings),
      expensesByCategory: actualCalculation.expensesByCategory
    };

    return {
      actual: actualCalculation,
      projected: projectedCalculation,
      monthsElapsed,
      monthsRemaining
    };
  }

  /**
   * Genera datos pre-llenados para Formulario 515
   */
  async generateForm515Data(
    userId: string,
    fiscalYear: number
  ): Promise<{
    seccionII: { ingresosBrutos: number };
    seccionIII: { egresosDeducibles: number; detallePorCategoria: any };
    seccionIV: { rentaNeta: number };
    seccionV: {
      tramo1: any;
      tramo2: any;
      tramo3: any;
      totalImpuesto: number;
    };
    seccionVI: { retenciones: number };
    seccionVII: { saldoAPagar: number; saldoAFavor: number };
  }> {
    const calculation = await this.calculateAnnualIRP(userId, fiscalYear);

    return {
      seccionII: {
        ingresosBrutos: calculation.grossIncome
      },
      seccionIII: {
        egresosDeducibles: calculation.deductibleExpenses,
        detallePorCategoria: calculation.expensesByCategory
      },
      seccionIV: {
        rentaNeta: calculation.netIncome
      },
      seccionV: {
        tramo1: calculation.tramo1,
        tramo2: calculation.tramo2,
        tramo3: calculation.tramo3,
        totalImpuesto: calculation.totalTax
      },
      seccionVI: {
        retenciones: calculation.withholdings
      },
      seccionVII: {
        saldoAPagar: Math.max(0, calculation.totalTax - calculation.withholdings),
        saldoAFavor: Math.max(0, calculation.withholdings - calculation.totalTax)
      }
    };
  }
}
export { IRPCalculationResult };