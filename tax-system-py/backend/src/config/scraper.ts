export const SCRAPER_CONFIG = {
  MARANGATU_URL: 'https://marangatu.set.gov.py',
  TIMEOUT: 60000,
  HEADLESS: process.env.NODE_ENV === 'production',
  SCREENSHOT_ON_ERROR: true,
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000
};
