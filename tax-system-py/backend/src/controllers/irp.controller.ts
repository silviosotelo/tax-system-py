import { Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../middleware/auth.middleware';
import { IRPCalculatorService } from '../services/irpCalculator.service';
import logger from '../utils/logger';

export class IRPController {
  private irpCalculator: IRPCalculatorService;

  constructor(private db: Pool) {
    this.irpCalculator = new IRPCalculatorService(db);
  }

  async calculateAnnual(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { year } = req.params;
      const calculation = await this.irpCalculator.calculateAnnualIRP(
        req.userId!,
        parseInt(year)
      );
      res.json(calculation);
    } catch (error) {
      logger.error('Error al calcular IRP anual:', error);
      res.status(500).json({ error: 'Error al calcular IRP' });
    }
  }

  async getProjection(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { year, month } = req.params;
      const projection = await this.irpCalculator.projectAnnualIRP(
        req.userId!,
        parseInt(year),
        parseInt(month)
      );
      res.json(projection);
    } catch (error) {
      logger.error('Error al obtener proyección IRP:', error);
      res.status(500).json({ error: 'Error al obtener proyección' });
    }
  }

  async generateForm515(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { year } = req.params;
      const formData = await this.irpCalculator.generateForm515Data(
        req.userId!,
        parseInt(year)
      );
      res.json(formData);
    } catch (error) {
      logger.error('Error al generar formulario 515:', error);
      res.status(500).json({ error: 'Error al generar formulario' });
    }
  }
}
