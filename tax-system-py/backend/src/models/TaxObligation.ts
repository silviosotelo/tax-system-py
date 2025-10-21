export interface TaxObligation {
  id: string;
  user_id: string;
  tax_type: 'IVA' | 'IRP';
  fiscal_period: Date;
  due_date: Date;
  debito_fiscal?: number;
  credito_fiscal?: number;
  gross_income?: number;
  deductible_expenses?: number;
  net_income?: number;
  calculated_tax: number;
  withholdings_amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paid_date?: Date;
  payment_method?: string;
  confirmation_number?: string;
  payment_receipt?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TaxObligationCreateDTO {
  tax_type: 'IVA' | 'IRP';
  fiscal_period: Date;
  due_date: Date;
  calculated_tax: number;
  debito_fiscal?: number;
  credito_fiscal?: number;
  gross_income?: number;
  deductible_expenses?: number;
  net_income?: number;
}
