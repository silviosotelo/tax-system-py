import { Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../middleware/auth.middleware';
import { encrypt, decrypt } from '../utils/encryption';
import logger from '../utils/logger';

export class SettingsController {
  constructor(private db: Pool) {}

  async getSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query = 'SELECT * FROM system_settings WHERE user_id = $1';
      const result = await this.db.query(query, [req.userId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Configuración no encontrada' });
        return;
      }

      const settings = result.rows[0];
      delete settings.marangatu_password_encrypted;

      res.json(settings);
    } catch (error) {
      logger.error('Error al obtener configuración:', error);
      res.status(500).json({ error: 'Error al obtener configuración' });
    }
  }

  async updateSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const updates = req.body;

      if (updates.marangatu_password) {
        updates.marangatu_password_encrypted = encrypt(updates.marangatu_password);
        delete updates.marangatu_password;
      }

      const updateQuery = `
        UPDATE system_settings
        SET 
          marangatu_username = COALESCE($1, marangatu_username),
          marangatu_password_encrypted = COALESCE($2, marangatu_password_encrypted),
          auto_scrape_enabled = COALESCE($3, auto_scrape_enabled),
          auto_scrape_frequency = COALESCE($4, auto_scrape_frequency),
          email_notifications = COALESCE($5, email_notifications),
          set_apikey = COALESCE($6, set_apikey)
        WHERE user_id = $7
        RETURNING *
      `;

      const result = await this.db.query(updateQuery, [
        updates.marangatu_username,
        updates.marangatu_password_encrypted,
        updates.auto_scrape_enabled,
        updates.auto_scrape_frequency,
        updates.email_notifications,
        updates.set_apikey,
        req.userId
      ]);

      const settings = result.rows[0];
      delete settings.marangatu_password_encrypted;

      logger.info(\`Configuración actualizada para usuario \${req.userId}\`);
      res.json(settings);
    } catch (error) {
      logger.error('Error al actualizar configuración:', error);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  }
}
