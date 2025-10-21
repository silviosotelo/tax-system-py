export const NOTIFICATION_CONFIG = {
  DAYS_BEFORE_DUE: [7, 3, 1],
  EMAIL_ENABLED: process.env.EMAIL_NOTIFICATIONS === 'true',
  SMTP: {
    HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    PORT: parseInt(process.env.SMTP_PORT || '587'),
    USER: process.env.SMTP_USER || '',
    PASSWORD: process.env.SMTP_PASSWORD || '',
    FROM: process.env.EMAIL_FROM || 'noreply@taxsystem.py'
  }
};
