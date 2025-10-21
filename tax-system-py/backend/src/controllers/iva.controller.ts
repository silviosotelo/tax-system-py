import { Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../middleware/auth.middleware';
import { IVACalculatorService } from '../services/ivaCalculator.service';
import logger from '../utils/logger';

export class IVAController {
  private ivaCalculator: IVACalculatorService;

  constructor(private db: Pool) {
    this.ivaCalculator = new IVACalculatorService(db);
  }

  async calculateMonthly(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { year, month } = req.params;
      const calculation = await this.ivaCalculator.calculateMonthlyIVA(
        req.userId!,
        parseInt(year),
        parseInt(month)
      );
      res.json(calculation);
    } catch (error) {
      logger.error('Error al calcular IVA mensual:', error);
      res.status(500).json({ error: 'Error al calcular IVA' });
    }
  }

  async getTrend(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { months = 12 } = req.query;
      const trend = await this.ivaCalculator.getIVATrend(
        req.userId!,
        parseInt(months as string)
      );
      res.json(trend);
    } catch (error) {
      logger.error('Error al obtener tendencia IVA:', error);
      res.status(500).json({ error: 'Error al obtener tendencia' });
    }
  }

  async generateForm120(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { year, month } = req.params;
      const formData = await this.ivaCalculator.generateForm120Data(
        req.userId!,
        parseInt(year),
        parseInt(month)
      );
      res.json(formData);
    } catch (error) {
      logger.error('Error al generar formulario 120:', error);
      res.status(500).json({ error: 'Error al generar formulario' });
    }
  }
}
