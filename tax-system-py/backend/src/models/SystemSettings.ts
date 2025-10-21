export interface SystemSettings {
  id: string;
  user_id: string;
  marangatu_username?: string;
  marangatu_password_encrypted?: string;
  auto_scrape_enabled: boolean;
  auto_scrape_frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  last_scrape_date?: Date;
  email_notifications: boolean;
  notification_days_before: number[];
  auto_categorize_enabled: boolean;
  known_suppliers: KnownSupplier[];
  set_apikey?: string;
  default_iva_rate: number;
  fiscal_year_start: number;
  created_at: Date;
  updated_at: Date;
}

export interface KnownSupplier {
  ruc: string;
  name: string;
  iva_category?: string;
  irp_category?: string;
}

export interface SystemSettingsUpdateDTO {
  marangatu_username?: string;
  marangatu_password?: string;
  auto_scrape_enabled?: boolean;
  auto_scrape_frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  email_notifications?: boolean;
  notification_days_before?: number[];
  auto_categorize_enabled?: boolean;
  known_suppliers?: KnownSupplier[];
  set_apikey?: string;
  default_iva_rate?: number;
}
