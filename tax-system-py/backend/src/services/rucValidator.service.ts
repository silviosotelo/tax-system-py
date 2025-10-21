import axios from 'axios';
import logger from '../utils/logger';

interface RUCValidationResult {
  valid: boolean;
  ruc?: string;
  dv?: string;
  name?: string;
  message?: string;
}

export class RUCValidatorService {
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  validateFormat(ruc: string, dv: string): boolean {
    if (!/^\d{1,8}$/.test(ruc)) return false;
    if (!/^\d{1}$/.test(dv)) return false;
    const calculatedDV = this.calculateDV(ruc);
    return calculatedDV === parseInt(dv);
  }

  calculateDV(ruc: string): number {
    const rucStr = ruc.padStart(8, '0');
    const k = 11;
    const multipliers = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7];
    let sum = 0;

    for (let i = 0; i < rucStr.length; i++) {
      sum += parseInt(rucStr[i]) * multipliers[i];
    }

    const remainder = sum % k;
    const dv = k - remainder;
    return dv === 10 ? 0 : dv === 11 ? 0 : dv;
  }

  async validateWithSET(ruc: string, dv: string): Promise<RUCValidationResult> {
    if (!this.apiKey) {
      return {
        valid: this.validateFormat(ruc, dv),
        message: 'API Key no configurada, solo validación de formato'
      };
    }

    try {
      const fullRUC = `${ruc}-${dv}`;
      const response = await axios.get(
        `https://servicios.set.gov.py/eset-publico/consultaruc/${fullRUC}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 5000
        }
      );

      if (response.data && response.data.razonSocial) {
        return {
          valid: true,
          ruc,
          dv,
          name: response.data.razonSocial
        };
      }

      return {
        valid: false,
        message: 'RUC no encontrado en la base de datos de la SET'
      };

    } catch (error) {
      logger.error('Error al validar RUC con SET:', error);
      return {
        valid: this.validateFormat(ruc, dv),
        message: 'Error al consultar API de SET, validación de formato aplicada'
      };
    }
  }
}

export default RUCValidatorService;
