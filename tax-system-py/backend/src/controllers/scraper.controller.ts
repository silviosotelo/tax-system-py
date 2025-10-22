import { Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../middleware/auth.middleware';
import { MarangatuScraperService } from '../services/marangatuScraper.service';
import logger from '../utils/logger';

export class ScraperController {
  constructor(private db: Pool) {}

  async executeScrape(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type, periodFrom, periodTo } = req.body;

      const settingsQuery = 'SELECT * FROM system_settings WHERE user_id = $1';
      const settingsResult = await this.db.query(settingsQuery, [req.userId]);

      if (settingsResult.rows.length === 0) {
        res.status(404).json({ error: 'Configuración no encontrada' });
        return;
      }

      const settings = settingsResult.rows[0];

      if (!settings.marangatu_username || !settings.marangatu_password_encrypted) {
        res.status(400).json({ error: 'Credenciales de Marangatu no configuradas' });
        return;
      }

      const sessionQuery = `
        INSERT INTO scraper_sessions (user_id, scrape_type, period_from, period_to, status)
        VALUES ($1, $2, $3, $4, 'PENDING')
        RETURNING id
      `;
      const sessionResult = await this.db.query(sessionQuery, [
        req.userId,
        type,
        periodFrom,
        periodTo
      ]);
      const sessionId = sessionResult.rows[0].id;

      res.json({
        message: 'Scraping iniciado',
        sessionId,
        status: 'PENDING'
      });

      const scraper = new MarangatuScraperService(this.db);
      scraper.scrape(
        req.userId!,
        settings.marangatu_username,
        settings.marangatu_password_encrypted,
        new Date(periodFrom),
        new Date(periodTo),
        type
      ).catch((err: Error) => {
        logger.error('Error en scraping asíncrono:', err);
      });

    } catch (error) {
      logger.error('Error al ejecutar scraping:', error);
      res.status(500).json({ error: 'Error al ejecutar scraping' });
    }
  }

  async getSessionStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const query = 'SELECT * FROM scraper_sessions WHERE id = $1 AND user_id = $2';
      const result = await this.db.query(query, [sessionId, req.userId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Sesión no encontrada' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Error al obtener estado de sesión:', error);
      res.status(500).json({ error: 'Error al obtener estado' });
    }
  }

  async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query = `
        SELECT * FROM scraper_sessions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `;
      const result = await this.db.query(query, [req.userId]);
      res.json(result.rows);
    } catch (error) {
      logger.error('Error al obtener historial de scraping:', error);
      res.status(500).json({ error: 'Error al obtener historial' });
    }
  }
}