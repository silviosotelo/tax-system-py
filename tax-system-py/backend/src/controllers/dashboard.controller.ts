import { Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../middleware/auth.middleware';
import { IVACalculatorService } from '../services/ivaCalculator.service';
import { IRPCalculatorService } from '../services/irpCalculator.service';
import logger from '../utils/logger';

export class DashboardController {
  private ivaCalculator: IVACalculatorService;
  private irpCalculator: IRPCalculatorService;

  constructor(private db: Pool) {
    this.ivaCalculator = new IVACalculatorService(db);
    this.irpCalculator = new IRPCalculatorService(db);
  }

  async getSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      const ivaData = await this.ivaCalculator.calculateMonthlyIVA(
        req.userId!,
        currentYear,
        currentMonth
      );

      const irpProjection = await this.irpCalculator.projectAnnualIRP(
        req.userId!,
        currentYear,
        currentMonth
      );

      const notificationsQuery = `
        SELECT COUNT(*) as unread_count
        FROM notifications
        WHERE user_id = $1 AND read = false
      `;
      const notifResult = await this.db.query(notificationsQuery, [req.userId]);

      const nextObligationQuery = `
        SELECT * FROM tax_obligations
        WHERE user_id = $1 AND status = 'PENDING'
        ORDER BY due_date ASC
        LIMIT 1
      `;
      const obligationResult = await this.db.query(nextObligationQuery, [req.userId]);

      res.json({
        currentMonth: {
          period: `${currentMonth}/${currentYear}`,
          iva: {
            debitoFiscal: ivaData.debitoFiscal,
            creditoFiscal: ivaData.creditoFiscal,
            saldoAPagar: ivaData.saldoIVA,
            totalIngresos: ivaData.totalIngresos,
            totalEgresos: ivaData.totalEgresos
          }
        },
        currentYear: {
          year: currentYear,
          irp: {
            grossIncome: irpProjection.actual.grossIncome,
            deductibleExpenses: irpProjection.actual.deductibleExpenses,
            netIncome: irpProjection.actual.netIncome,
            projectedTax: irpProjection.projected.totalTax
          }
        },
        notifications: {
          unreadCount: parseInt(notifResult.rows[0].unread_count)
        },
        nextObligation: obligationResult.rows[0] || null
      });
    } catch (error) {
      logger.error('Error al obtener resumen del dashboard:', error);
      res.status(500).json({ error: 'Error al obtener resumen' });
    }
  }

  async getChartData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type, months = 12 } = req.query;

      if (type === 'iva-trend') {
        const data = await this.ivaCalculator.getIVATrend(req.userId!, parseInt(months as string));
        res.json(data);
      } else if (type === 'income-expenses') {
        const query = `
          SELECT 
            TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') as period,
            SUM(CASE WHEN type = 'INGRESO' THEN gross_amount ELSE 0 END) as ingresos,
            SUM(CASE WHEN type = 'EGRESO' THEN gross_amount ELSE 0 END) as egresos
          FROM transactions
          WHERE user_id = $1
            AND transaction_date >= CURRENT_DATE - INTERVAL '${months} months'
          GROUP BY period
          ORDER BY period
        `;
        const result = await this.db.query(query, [req.userId]);
        res.json(result.rows);
      } else {
        res.status(400).json({ error: 'Tipo de gráfico inválido' });
      }
    } catch (error) {
      logger.error('Error al obtener datos de gráfico:', error);
      res.status(500).json({ error: 'Error al obtener datos' });
    }
  }
}
