/**
 * SERVICIO DE WEB SCRAPING - MARANGATU
 * 
 * Extrae automáticamente facturas emitidas y recibidas desde el Sistema Marangatu
 * usando Puppeteer para automatizar la navegación del navegador.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { Pool } from 'pg';
import logger from '../utils/logger';
import { decrypt } from '../utils/encryption';

interface MarangatuCredentials {
  username: string;
  encryptedPassword: string;
}

interface ScrapedDocument {
  documentType: string;
  documentNumber: string;
  timbrado: string;
  date: Date;
  rucCounterpart: string;
  dvCounterpart: string;
  nameCounterpart: string;
  grossAmount: number;
  ivaRate: number;
  ivaAmount: number;
  netAmount: number;
}

interface ScrapeResult {
  success: boolean;
  totalFound: number;
  documents: ScrapedDocument[];
  errors: string[];
}

export class MarangatuScraperService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private readonly baseUrl = 'https://marangatu.set.gov.py';
  private readonly timeout = 30000;

  constructor(private db: Pool) {}

  /**
   * Inicializa el navegador headless
   */
  async initBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      });

      this.page = await this.browser.newPage();
      
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      logger.info('Navegador Puppeteer inicializado correctamente');
    } catch (error) {
      logger.error('Error al inicializar navegador:', error);
      throw new Error('No se pudo inicializar el navegador');
    }
  }

  /**
   * Login en Marangatu
   */
  async login(credentials: MarangatuCredentials): Promise<boolean> {
    if (!this.page) {
      throw new Error('El navegador no está inicializado');
    }

    try {
      logger.info('Iniciando login en Marangatu...');

      await this.page.goto(`${this.baseUrl}/eset/login`, {
        waitUntil: 'networkidle2',
        timeout: this.timeout
      });

      await this.page.waitForSelector('#j_username', { timeout: this.timeout });

      const password = decrypt(credentials.encryptedPassword);

      await this.page.type('#j_username', credentials.username);
      await this.page.type('#j_password', password);

      await this.page.click('button[type="submit"]');

      await this.page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: this.timeout 
      });

      const currentUrl = this.page.url();
      
      if (currentUrl.includes('/eset/inicio') || currentUrl.includes('/eset/home')) {
        logger.info('Login exitoso en Marangatu');
        
        await this.page.screenshot({ 
          path: `/tmp/marangatu-dashboard-${Date.now()}.png` 
        });
        
        return true;
      }

      const errorMessage = await this.page.$eval(
        '.alert-danger, .error-message',
        el => el.textContent
      ).catch(() => null);

      if (errorMessage) {
        logger.error('Error en login:', errorMessage);
        throw new Error(`Login fallido: ${errorMessage}`);
      }

      logger.error('Login fallido: URL inesperada', currentUrl);
      return false;

    } catch (error) {
      logger.error('Error durante el login:', error);
      
      if (this.page) {
        await this.page.screenshot({ 
          path: `/tmp/marangatu-error-${Date.now()}.png` 
        }).catch(() => {});
      }
      
      return false;
    }
  }

  /**
   * Extrae facturas emitidas (ventas)
   */
  async scrapeIssuedInvoices(
    dateFrom: Date,
    dateTo: Date
  ): Promise<ScrapeResult> {
    if (!this.page) {
      throw new Error('El navegador no está inicializado');
    }

    const result: ScrapeResult = {
      success: false,
      totalFound: 0,
      documents: [],
      errors: []
    };

    try {
      logger.info('Extrayendo facturas emitidas...');

      await this.page.goto(
        `${this.baseUrl}/eset/gestion-comprobantes/comprobantes-emitidos`,
        { waitUntil: 'networkidle2', timeout: this.timeout }
      );

      await this.page.waitForSelector('#fechaDesde', { timeout: this.timeout });

      const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      await this.page.evaluate(() => {
        const fechaDesde = document.querySelector('#fechaDesde') as HTMLInputElement;
        const fechaHasta = document.querySelector('#fechaHasta') as HTMLInputElement;
        if (fechaDesde) fechaDesde.value = '';
        if (fechaHasta) fechaHasta.value = '';
      });

      await this.page.type('#fechaDesde', formatDate(dateFrom));
      await this.page.type('#fechaHasta', formatDate(dateTo));

      await this.page.click('button#btnBuscar');

      await this.page.waitForTimeout(2000);

      const noResults = await this.page.$('.no-results, .sin-datos');
      
      if (noResults) {
        logger.info('No se encontraron facturas emitidas en el período');
        result.success = true;
        return result;
      }

      const documents = await this.page.evaluate(() => {
        const rows = Array.from(
          document.querySelectorAll('table#tablaComprobantes tbody tr')
        );

        return rows.map((row) => {
          const cells = row.querySelectorAll('td');
          
          return {
            documentType: cells[0]?.textContent?.trim() || '',
            documentNumber: cells[1]?.textContent?.trim() || '',
            timbrado: cells[2]?.textContent?.trim() || '',
            date: cells[3]?.textContent?.trim() || '',
            rucCounterpart: cells[4]?.textContent?.trim() || '',
            dvCounterpart: cells[5]?.textContent?.trim() || '',
            nameCounterpart: cells[6]?.textContent?.trim() || '',
            grossAmountStr: cells[7]?.textContent?.trim() || '0',
          };
        });
      });

      for (const doc of documents) {
        try {
          const grossAmount = parseFloat(
            doc.grossAmountStr.replace(/\./g, '').replace(',', '.')
          );

          const ivaRate = 10;
          const netAmount = grossAmount / 1.10;
          const ivaAmount = grossAmount - netAmount;

          const parsedDoc: ScrapedDocument = {
            documentType: doc.documentType,
            documentNumber: doc.documentNumber,
            timbrado: doc.timbrado,
            date: this.parseDate(doc.date),
            rucCounterpart: doc.rucCounterpart,
            dvCounterpart: doc.dvCounterpart,
            nameCounterpart: doc.nameCounterpart,
            grossAmount,
            ivaRate,
            ivaAmount,
            netAmount
          };

          result.documents.push(parsedDoc);
        } catch (error) {
          const errorMsg = `Error procesando documento ${doc.documentNumber}: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      result.totalFound = result.documents.length;
      result.success = true;

      logger.info(`Extraídas ${result.totalFound} facturas emitidas`);

    } catch (error) {
      const errorMsg = `Error al extraer facturas emitidas: ${error}`;
      logger.error(errorMsg);
      result.errors.push(errorMsg);
      result.success = false;
    }

    return result;
  }

  /**
   * Extrae facturas recibidas (compras)
   */
  async scrapeReceivedInvoices(
    dateFrom: Date,
    dateTo: Date
  ): Promise<ScrapeResult> {
    if (!this.page) {
      throw new Error('El navegador no está inicializado');
    }

    const result: ScrapeResult = {
      success: false,
      totalFound: 0,
      documents: [],
      errors: []
    };

    try {
      logger.info('Extrayendo facturas recibidas...');

      await this.page.goto(
        `${this.baseUrl}/eset/declaraciones-informativas/compras-a-imputar`,
        { waitUntil: 'networkidle2', timeout: this.timeout }
      );

      await this.page.waitForSelector('#periodoDesde', { timeout: this.timeout });

      const formatPeriod = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${year}`;
      };

      await this.page.evaluate(() => {
        const periodoDesde = document.querySelector('#periodoDesde') as HTMLInputElement;
        const periodoHasta = document.querySelector('#periodoHasta') as HTMLInputElement;
        if (periodoDesde) periodoDesde.value = '';
        if (periodoHasta) periodoHasta.value = '';
      });

      await this.page.type('#periodoDesde', formatPeriod(dateFrom));
      await this.page.type('#periodoHasta', formatPeriod(dateTo));

      await this.page.click('button#btnConsultar');

      await this.page.waitForTimeout(3000);

      const noResults = await this.page.$('.no-results, .sin-datos');
      
      if (noResults) {
        logger.info('No se encontraron facturas recibidas en el período');
        result.success = true;
        return result;
      }

      const documents = await this.page.evaluate(() => {
        const rows = Array.from(
          document.querySelectorAll('table#tablaCompras tbody tr')
        );

        return rows.map((row) => {
          const cells = row.querySelectorAll('td');
          
          return {
            documentType: cells[0]?.textContent?.trim() || '',
            documentNumber: cells[1]?.textContent?.trim() || '',
            timbrado: cells[2]?.textContent?.trim() || '',
            date: cells[3]?.textContent?.trim() || '',
            rucCounterpart: cells[4]?.textContent?.trim() || '',
            dvCounterpart: cells[5]?.textContent?.trim() || '',
            nameCounterpart: cells[6]?.textContent?.trim() || '',
            grossAmountStr: cells[7]?.textContent?.trim() || '0',
            iva10Str: cells[8]?.textContent?.trim() || '0',
            iva5Str: cells[9]?.textContent?.trim() || '0',
          };
        });
      });

      for (const doc of documents) {
        try {
          const grossAmount = parseFloat(
            doc.grossAmountStr.replace(/\./g, '').replace(',', '.')
          );
          
          const iva10 = parseFloat(
            doc.iva10Str.replace(/\./g, '').replace(',', '.')
          );
          
          const iva5 = parseFloat(
            doc.iva5Str.replace(/\./g, '').replace(',', '.')
          );

          const ivaAmount = iva10 + iva5;
          const ivaRate = iva10 > 0 ? 10 : (iva5 > 0 ? 5 : 0);
          const netAmount = grossAmount - ivaAmount;

          const parsedDoc: ScrapedDocument = {
            documentType: doc.documentType,
            documentNumber: doc.documentNumber,
            timbrado: doc.timbrado,
            date: this.parseDate(doc.date),
            rucCounterpart: doc.rucCounterpart,
            dvCounterpart: doc.dvCounterpart,
            nameCounterpart: doc.nameCounterpart,
            grossAmount,
            ivaRate,
            ivaAmount,
            netAmount
          };

          result.documents.push(parsedDoc);
        } catch (error) {
          const errorMsg = `Error procesando documento ${doc.documentNumber}: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      result.totalFound = result.documents.length;
      result.success = true;

      logger.info(`Extraídas ${result.totalFound} facturas recibidas`);

    } catch (error) {
      const errorMsg = `Error al extraer facturas recibidas: ${error}`;
      logger.error(errorMsg);
      result.errors.push(errorMsg);
      result.success = false;
    }

    return result;
  }

  /**
   * Método principal de scraping
   */
  async scrape(
    userId: string,
    username: string,
    encryptedPassword: string,
    dateFrom: Date,
    dateTo: Date,
    type: 'ISSUED' | 'RECEIVED' | 'BOTH'
  ): Promise<void> {
    try {
      await this.initBrowser();
      
      const loginSuccess = await this.login({ username, encryptedPassword });
      
      if (!loginSuccess) {
        throw new Error('Login fallido en Marangatu');
      }

      await this.page!.waitForTimeout(2000);

      let issued: ScrapeResult | undefined;
      let received: ScrapeResult | undefined;

      if (type === 'ISSUED' || type === 'BOTH') {
        issued = await this.scrapeIssuedInvoices(dateFrom, dateTo);
        
        // Guardar facturas emitidas en la base de datos
        if (issued.documents.length > 0) {
          for (const doc of issued.documents) {
            await this.saveTransaction(userId, doc, 'INGRESO');
          }
        }
      }

      if (type === 'RECEIVED' || type === 'BOTH') {
        received = await this.scrapeReceivedInvoices(dateFrom, dateTo);
        
        // Guardar facturas recibidas en la base de datos
        if (received.documents.length > 0) {
          for (const doc of received.documents) {
            await this.saveTransaction(userId, doc, 'EGRESO');
          }
        }
      }

      await this.close();
    } catch (error) {
      logger.error('Error en scraping:', error);
      await this.close();
      throw error;
    }
  }

  /**
   * Guarda una transacción en la base de datos
   */
  private async saveTransaction(
    userId: string,
    doc: ScrapedDocument,
    type: 'INGRESO' | 'EGRESO'
  ): Promise<void> {
    try {
      // Verificar si ya existe
      const existsQuery = `
        SELECT id FROM transactions 
        WHERE user_id = $1 
          AND document_number = $2 
          AND transaction_date = $3
      `;
      const existsResult = await this.db.query(existsQuery, [
        userId,
        doc.documentNumber,
        doc.date
      ]);

      if (existsResult.rows.length > 0) {
        logger.info(`Transacción ${doc.documentNumber} ya existe, omitiendo`);
        return;
      }

      // Insertar nueva transacción
      const insertQuery = `
        INSERT INTO transactions (
          user_id, transaction_date, type, document_type, document_number,
          timbrado, ruc_counterpart, dv_counterpart, name_counterpart,
          gross_amount, iva_rate, iva_amount, net_amount,
          source, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'SCRAPER', 'REGISTERED'
        )
      `;

      await this.db.query(insertQuery, [
        userId,
        doc.date,
        type,
        doc.documentType,
        doc.documentNumber,
        doc.timbrado,
        doc.rucCounterpart,
        doc.dvCounterpart,
        doc.nameCounterpart,
        doc.grossAmount,
        doc.ivaRate,
        doc.ivaAmount,
        doc.netAmount
      ]);

      logger.info(`Transacción ${doc.documentNumber} guardada exitosamente`);
    } catch (error) {
      logger.error('Error al guardar transacción:', error);
    }
  }

  /**
   * Parsea fecha en formato DD/MM/YYYY a Date
   */
  private parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Cierra el navegador
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info('Navegador cerrado');
    }
  }
}