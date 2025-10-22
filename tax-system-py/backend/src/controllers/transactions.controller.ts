import { Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../middleware/auth.middleware';
import { TransactionCreateDTO, TransactionUpdateDTO } from '../models/Transaction';
import logger from '../utils/logger';

export class TransactionsController {
  constructor(private db: Pool) {}

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, type, source } = req.query;
      
      let query = 'SELECT * FROM transactions WHERE user_id = $1';
      const params: any[] = [req.userId];
      let paramCount = 1;

      if (startDate) {
        paramCount++;
        query += ` AND transaction_date >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND transaction_date <= $${paramCount}`;
        params.push(endDate);
      }

      if (type) {
        paramCount++;
        query += ` AND type = $${paramCount}`;
        params.push(type);
      }

      if (source) {
        paramCount++;
        query += ` AND source = $${paramCount}`;
        params.push(source);
      }

      query += ' ORDER BY transaction_date DESC, created_at DESC';

      const result = await this.db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      logger.error('Error al obtener transacciones:', error);
      res.status(500).json({ error: 'Error al obtener transacciones' });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.db.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
        [id, req.userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Transacción no encontrada' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Error al obtener transacción:', error);
      res.status(500).json({ error: 'Error al obtener transacción' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data: TransactionCreateDTO = req.body;
      
      const ivaRate = data.iva_rate || 10;
      const grossAmount = data.gross_amount;
      const netAmount = grossAmount / (1 + ivaRate / 100);
      const ivaAmount = grossAmount - netAmount;

      const query = `
        INSERT INTO transactions (
          user_id, transaction_date, type, document_type, document_number,
          ruc_counterpart, dv_counterpart, name_counterpart,
          gross_amount, iva_rate, iva_amount, net_amount,
          is_creditable_iva, iva_deduction_category,
          is_deductible_irp, irp_deduction_category,
          description, notes, source, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, 'MANUAL', $19
        ) RETURNING *
      `;

      const result = await this.db.query(query, [
        req.userId, data.transaction_date, data.type, data.document_type, 
        data.document_number, data.ruc_counterpart, data.dv_counterpart, 
        data.name_counterpart, grossAmount, ivaRate, ivaAmount, netAmount,
        data.type === 'EGRESO' && !!data.iva_deduction_category,
        data.iva_deduction_category || null,
        data.is_deductible_irp || false,
        data.irp_deduction_category || null,
        data.description, data.notes, req.userId
      ]);

      logger.info(`Transacción creada: ${result.rows[0].id}`);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      logger.error('Error al crear transacción:', error);
      res.status(500).json({ error: 'Error al crear transacción' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.db.query(
        'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, req.userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Transacción no encontrada' });
        return;
      }

      res.json({ message: 'Transacción eliminada exitosamente' });
    } catch (error) {
      logger.error('Error al eliminar transacción:', error);
      res.status(500).json({ error: 'Error al eliminar transacción' });
    }
  }
}