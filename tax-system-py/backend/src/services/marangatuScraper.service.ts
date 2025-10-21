/**
 * SERVICIO DE WEB SCRAPING - MARANGATU
 * 
 * Extrae automáticamente facturas emitidas y recibidas desde el Sistema Marangatu
 * usando Puppeteer para automatizar la navegación del navegador.
 * 
 * IMPORTANTE: El scraping puede fallar si la SET cambia la estructura del sitio.
 * Mantener actualizado según versión de Marangatu.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';
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
  private readonly timeout = 30000; // 30 segundos

  /**
   * Inicializa el navegador headless
   */
  async initBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: true, // Cambiar a false para debugging
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
      
      // User agent para evitar detección de bot
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

      // Navegar a página de login
      await this.page.goto(`${this.baseUrl}/eset/login`, {
        waitUntil: 'networkidle2',
        timeout: this.timeout
      });

      // Esperar a que cargue el formulario de login
      await this.page.waitForSelector('#j_username', { timeout: this.timeout });

      // Desencriptar contraseña
      const password = decrypt(credentials.encryptedPassword);

      // Completar formulario
      await this.page.type('#j_username', credentials.username);
      await this.page.type('#j_password', password);

      // Click en botón de login
      await this.page.click('button[type="submit"]');

      // Esperar navegación o mensaje de error
      await this.page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: this.timeout 
      });

      // Verificar si el login fue exitoso
      const currentUrl = this.page.url();
      
      if (currentUrl.includes('/eset/inicio') || currentUrl.includes('/eset/home')) {
        logger.info('Login exitoso en Marangatu');
        
        // Tomar screenshot del dashboard para debugging
        await this.page.screenshot({ 
          path: `/tmp/marangatu-dashboard-${Date.now()}.png` 
        });
        
        return true;
      }

      // Verificar si hay mensaje de error
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
      
      // Capturar screenshot del error
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

      // Navegar al módulo de comprobantes emitidos
      await this.page.goto(
        `${this.baseUrl}/eset/gestion-comprobantes/comprobantes-emitidos`,
        { waitUntil: 'networkidle2', timeout: this.timeout }
      );

      // Esperar a que cargue el formulario de búsqueda
      await this.page.waitForSelector('#fechaDesde', { timeout: this.timeout });

      // Formatear fechas (DD/MM/YYYY)
      const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      // Completar fechas
      await this.page.evaluate(() => {
        (document.querySelector('#fechaDesde') as HTMLInputElement).value = '';
        (document.querySelector('#fechaHasta') as HTMLInputElement).value = '';
      });

      await this.page.type('#fechaDesde', formatDate(dateFrom));
      await this.page.type('#fechaHasta', formatDate(dateTo));

      // Click en buscar
      await this.page.click('button#btnBuscar');

      // Esperar resultados
      await this.page.waitForTimeout(2000);

      // Verificar si hay resultados
      const noResults = await this.page.$('.no-results, .sin-datos');
      
      if (noResults) {
        logger.info('No se encontraron facturas emitidas en el período');
        result.success = true;
        return result;
      }

      // Extraer datos de la tabla de resultados
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

      // Procesar y parsear documentos
      for (const doc of documents) {
        try {
          const grossAmount = parseFloat(
            doc.grossAmountStr.replace(/\./g, '').replace(',', '.')
          );

          // Calcular IVA (asumiendo tasa 10%)
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

      // Navegar al módulo de compras a imputar
      await this.page.goto(
        `${this.baseUrl}/eset/declaraciones-informativas/compras-a-imputar`,
        { waitUntil: 'networkidle2', timeout: this.timeout }
      );

      // Esperar el formulario de consulta
      await this.page.waitForSelector('#periodoDesde', { timeout: this.timeout });

      // Formatear período (MM/YYYY)
      const formatPeriod = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${year}`;
      };

      // Completar períodos
      await this.page.evaluate(() => {
        (document.querySelector('#periodoDesde') as HTMLInputElement).value = '';
        (document.querySelector('#periodoHasta') as HTMLInputElement).value = '';
      });

      await this.page.type('#periodoDesde', formatPeriod(dateFrom));
      await this.page.type('#periodoHasta', formatPeriod(dateTo));

      // Click en consultar
      await this.page.click('button#btnConsultar');

      // Esperar resultados
      await this.page.waitForTimeout(3000);

      // Verificar si hay resultados
      const noResults = await this.page.$('.no-results, .sin-datos');
      
      if (noResults) {
        logger.info('No se encontraron facturas recibidas en el período');
        result.success = true;
        return result;
      }

      // Extraer datos de la tabla
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

      // Procesar documentos
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
   * Extrae tanto facturas emitidas como recibidas
   */
  async scrapeAll(
    dateFrom: Date,
    dateTo: Date
  ): Promise<{
    issued: ScrapeResult;
    received: ScrapeResult;
  }> {
    logger.info('Iniciando scraping completo de Marangatu...');

    const issued = await this.scrapeIssuedInvoices(dateFrom, dateTo);
    const received = await this.scrapeReceivedInvoices(dateFrom, dateTo);

    logger.info(
      `Scraping completo: ${issued.totalFound} emitidas, ${received.totalFound} recibidas`
    );

    return { issued, received };
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

  /**
   * Método principal: ejecuta scraping completo
   */
  async executeScraping(
    credentials: MarangatuCredentials,
    dateFrom: Date,
    dateTo: Date,
    scrapeType: 'ISSUED' | 'RECEIVED' | 'BOTH' = 'BOTH'
  ): Promise<{
    success: boolean;
    issued?: ScrapeResult;
    received?: ScrapeResult;
    error?: string;
  }> {
    try {
      // Inicializar navegador
      await this.initBrowser();

      // Login
      const loginSuccess = await this.login(credentials);
      
      if (!loginSuccess) {
        throw new Error('Login fallido en Marangatu');
      }

      // Esperar un poco después del login
      await this.page!.waitForTimeout(2000);

      let issued: ScrapeResult | undefined;
      let received: ScrapeResult | undefined;

      // Ejecutar scraping según tipo solicitado
      if (scrapeType === 'ISSUED' || scrapeType === 'BOTH') {
        issued = await this.scrapeIssuedInvoices(dateFrom, dateTo);
      }

      if (scrapeType === 'RECEIVED' || scrapeType === 'BOTH') {
        received = await this.scrapeReceivedInvoices(dateFrom, dateTo);
      }

      // Cerrar navegador
      await this.close();

      return {
        success: true,
        issued,
        received
      };

    } catch (error) {
      logger.error('Error en scraping:', error);
      
      // Asegurar que el navegador se cierre
      await this.close();

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export default new MarangatuScraperService();