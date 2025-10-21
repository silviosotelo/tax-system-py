export interface Transaction {
  id: string;
  user_id: string;
  transaction_date: Date;
  type: 'INGRESO' | 'EGRESO';
  document_type: string;
  document_number?: string;
  timbrado?: string;
  cdc?: string;
  ruc_counterpart?: string;
  dv_counterpart?: string;
  name_counterpart?: string;
  gross_amount: number;
  iva_rate: number;
  iva_amount: number;
  net_amount: number;
  is_creditable_iva: boolean;
  iva_deduction_category?: string;
  iva_deduction_percentage: number;
  creditable_iva_amount: number;
  is_deductible_irp: boolean;
  irp_deduction_category?: string;
  description?: string;
  notes?: string;
  source: 'MANUAL' | 'SCRAPER' | 'IMPORT' | 'API';
  status: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

export interface TransactionCreateDTO {
  transaction_date: Date | string;
  type: 'INGRESO' | 'EGRESO';
  document_type: string;
  document_number?: string;
  timbrado?: string;
  cdc?: string;
  ruc_counterpart?: string;
  dv_counterpart?: string;
  name_counterpart?: string;
  gross_amount: number;
  iva_rate?: number;
  iva_deduction_category?: string;
  is_deductible_irp?: boolean;
  irp_deduction_category?: string;
  description?: string;
  notes?: string;
}

export interface TransactionUpdateDTO {
  transaction_date?: Date | string;
  document_type?: string;
  document_number?: string;
  ruc_counterpart?: string;
  name_counterpart?: string;
  gross_amount?: number;
  iva_deduction_category?: string;
  is_deductible_irp?: boolean;
  irp_deduction_category?: string;
  description?: string;
  notes?: string;
}
