import { Router } from 'express';
import { Pool } from 'pg';
import { authenticate } from '../middleware/auth.middleware';
import { AuthController } from '../controllers/auth.controller';
import { TransactionsController } from '../controllers/transactions.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { IVAController } from '../controllers/iva.controller';
import { IRPController } from '../controllers/irp.controller';
import { ScraperController } from '../controllers/scraper.controller';
import { SettingsController } from '../controllers/settings.controller';

export function createRoutes(db: Pool): Router {
  const router = Router();

  const authController = new AuthController(db);
  const transactionsController = new TransactionsController(db);
  const dashboardController = new DashboardController(db);
  const ivaController = new IVAController(db);
  const irpController = new IRPController(db);
  const scraperController = new ScraperController(db);
  const settingsController = new SettingsController(db);

  router.post('/auth/register', (req, res) => authController.register(req, res));
  router.post('/auth/login', (req, res) => authController.login(req, res));
  router.get('/auth/profile', authenticate, (req, res) => authController.getProfile(req, res));

  router.get('/transactions', authenticate, (req, res) => transactionsController.getAll(req, res));
  router.get('/transactions/:id', authenticate, (req, res) => transactionsController.getById(req, res));
  router.post('/transactions', authenticate, (req, res) => transactionsController.create(req, res));
  router.delete('/transactions/:id', authenticate, (req, res) => transactionsController.delete(req, res));

  router.get('/dashboard/summary', authenticate, (req, res) => dashboardController.getSummary(req, res));
  router.get('/dashboard/charts', authenticate, (req, res) => dashboardController.getChartData(req, res));

  router.get('/iva/:year/:month', authenticate, (req, res) => ivaController.calculateMonthly(req, res));
  router.get('/iva/trend', authenticate, (req, res) => ivaController.getTrend(req, res));
  router.get('/iva/:year/:month/form120', authenticate, (req, res) => ivaController.generateForm120(req, res));

  router.get('/irp/:year', authenticate, (req, res) => irpController.calculateAnnual(req, res));
  router.get('/irp/:year/:month/projection', authenticate, (req, res) => irpController.getProjection(req, res));
  router.get('/irp/:year/form515', authenticate, (req, res) => irpController.generateForm515(req, res));

  router.post('/scraper/execute', authenticate, (req, res) => scraperController.executeScrape(req, res));
  router.get('/scraper/session/:sessionId', authenticate, (req, res) => scraperController.getSessionStatus(req, res));
  router.get('/scraper/history', authenticate, (req, res) => scraperController.getHistory(req, res));

  router.get('/settings', authenticate, (req, res) => settingsController.getSettings(req, res));
  router.put('/settings', authenticate, (req, res) => settingsController.updateSettings(req, res));

  return router;
}
