import cron from 'node-cron';
import { Pool } from 'pg';
import { NotificationService } from '../services/notification.service';
import logger from '../utils/logger';

export function startNotificationJob(db: Pool) {
  const notificationService = new NotificationService(db);

  cron.schedule('0 8 * * *', async () => {
    logger.info('Verificando vencimientos tributarios');

    try {
      const query = \`
        SELECT 
          to.*, 
          u.email,
          EXTRACT(DAY FROM (to.due_date - CURRENT_DATE)) as days_until_due
        FROM tax_obligations to
        JOIN users u ON to.user_id = u.id
        WHERE to.status = 'PENDING'
          AND to.due_date >= CURRENT_DATE
          AND to.due_date <= CURRENT_DATE + INTERVAL '7 days'
      \`;

      const result = await db.query(query);

      for (const obligation of result.rows) {
        const daysUntil = parseInt(obligation.days_until_due);

        let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
        if (daysUntil <= 1) priority = 'CRITICAL';
        else if (daysUntil <= 3) priority = 'HIGH';
        else if (daysUntil <= 7) priority = 'MEDIUM';

        const checkQuery = 'SELECT id FROM notifications WHERE user_id = $1 AND related_obligation_id = $2';
        const existingNotif = await db.query(checkQuery, [obligation.user_id, obligation.id]);

        if (existingNotif.rows.length === 0) {
          await notificationService.create({
            user_id: obligation.user_id,
            type: \`TAX_DUE_\${daysUntil}D\`,
            priority,
            title: \`Vencimiento \${obligation.tax_type} en \${daysUntil} días\`,
            message: \`Su obligación de \${obligation.tax_type} vence pronto\`,
            related_obligation_id: obligation.id,
            send_email: true
          });

          logger.info(\`Notificación creada para \${obligation.user_id}\`);
        }
      }
    } catch (error) {
      logger.error('Error en job de notificaciones:', error);
    }
  });

  logger.info('Job de notificaciones programado: Diariamente 8:00 AM');
}
