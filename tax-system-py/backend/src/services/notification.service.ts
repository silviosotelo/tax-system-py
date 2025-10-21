import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import logger from '../utils/logger';
import { NOTIFICATION_CONFIG } from '../config/notifications';
import { Notification, NotificationCreateDTO } from '../models/Notification';

export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private db: Pool) {
    if (NOTIFICATION_CONFIG.EMAIL_ENABLED) {
      this.transporter = nodemailer.createTransport({
        host: NOTIFICATION_CONFIG.SMTP.HOST,
        port: NOTIFICATION_CONFIG.SMTP.PORT,
        secure: false,
        auth: {
          user: NOTIFICATION_CONFIG.SMTP.USER,
          pass: NOTIFICATION_CONFIG.SMTP.PASSWORD
        }
      });
    }
  }

  async create(data: NotificationCreateDTO): Promise<Notification> {
    try {
      const query = `
        INSERT INTO notifications (
          user_id, type, priority, title, message,
          related_obligation_id, related_data, send_email
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        data.user_id,
        data.type,
        data.priority,
        data.title,
        data.message,
        data.related_obligation_id || null,
        JSON.stringify(data.related_data || {}),
        data.send_email || false
      ]);

      const notification = result.rows[0];

      if (notification.send_email && this.transporter) {
        await this.sendEmail(notification);
      }

      return notification;
    } catch (error) {
      logger.error('Error al crear notificación:', error);
      throw error;
    }
  }

  async getUnreadByUser(userId: string): Promise<Notification[]> {
    const query = `
      SELECT * FROM notifications
      WHERE user_id = $1 AND read = false
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const query = `
      UPDATE notifications
      SET read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.db.query(query, [notificationId]);
  }

  private async sendEmail(notification: Notification): Promise<void> {
    if (!this.transporter) return;

    try {
      const userQuery = 'SELECT email FROM users WHERE id = $1';
      const userResult = await this.db.query(userQuery, [notification.user_id]);

      if (userResult.rows.length === 0) return;

      const userEmail = userResult.rows[0].email;

      await this.transporter.sendMail({
        from: NOTIFICATION_CONFIG.SMTP.FROM,
        to: userEmail,
        subject: notification.title,
        text: notification.message,
        html: `<p>${notification.message}</p>`
      });

      await this.db.query(
        'UPDATE notifications SET email_sent = true, email_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
        [notification.id]
      );

      logger.info(`Email enviado a ${userEmail} para notificación ${notification.id}`);
    } catch (error) {
      logger.error('Error al enviar email:', error);
    }
  }
}
