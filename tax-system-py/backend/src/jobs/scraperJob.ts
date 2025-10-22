import cron from 'node-cron';
import { Pool } from 'pg';
import { MarangatuScraperService } from '../services/marangatuScraper.service';
import logger from '../utils/logger';

export function startScraperJob(db: Pool) {
  cron.schedule('0 2 * * 1', async () => {
    logger.info('Iniciando scraping automático semanal');

    try {
      const query = `
        SELECT u.id as user_id, s.marangatu_username, s.marangatu_password_encrypted
        FROM users u
        JOIN system_settings s ON u.id = s.user_id
        WHERE s.auto_scrape_enabled = true
          AND s.marangatu_username IS NOT NULL
          AND s.marangatu_password_encrypted IS NOT NULL
      `;

      const result = await db.query(query);

      for (const row of result.rows) {
        const scraper = new MarangatuScraperService(db);
        const periodTo = new Date();
        const periodFrom = new Date();
        periodFrom.setDate(periodFrom.getDate() - 7);

        await scraper.scrape(
          row.user_id,
          row.marangatu_username,
          row.marangatu_password_encrypted,
          periodFrom,
          periodTo,
          'BOTH'
        );
      }

      logger.info('Scraping automático completado');
    } catch (error) {
      logger.error('Error en job de scraping:', error);
    }
  });

  logger.info('Job de scraping programado: Lunes 2:00 AM');
}