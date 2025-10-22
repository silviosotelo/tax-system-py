-- ============================================
-- SISTEMA DE GESTIÓN TRIBUTARIA - PARAGUAY
-- Script de Esquema Completo y Corregido
-- ============================================

-- Extensiones necesarias (SOLO PUEDE EJECUTARLO UN SUPERUSUARIO)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLA: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    ruc VARCHAR(20) UNIQUE NOT NULL,
    dv VARCHAR(2) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    activity_type VARCHAR(100) DEFAULT 'SERVICIOS_PROFESIONALES',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- ============================================
-- TABLA: transactions
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INGRESO', 'EGRESO')),
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100),
    timbrado VARCHAR(20),
    cdc VARCHAR(50),
    ruc_counterpart VARCHAR(20),
    dv_counterpart VARCHAR(2),
    name_counterpart VARCHAR(255),
    gross_amount NUMERIC(15,2) NOT NULL,
    iva_rate NUMERIC(5,2) DEFAULT 10.00,
    iva_amount NUMERIC(15,2) NOT NULL,
    net_amount NUMERIC(15,2) NOT NULL,
    is_creditable_iva BOOLEAN DEFAULT false,
    iva_deduction_category VARCHAR(50),
    iva_deduction_percentage INTEGER DEFAULT 0,
    creditable_iva_amount NUMERIC(15,2) DEFAULT 0,
    is_deductible_irp BOOLEAN DEFAULT false,
    irp_deduction_category VARCHAR(50),
    description TEXT,
    notes TEXT,
    source VARCHAR(50) DEFAULT 'MANUAL',
    status VARCHAR(20) DEFAULT 'REGISTERED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    CONSTRAINT valid_amounts CHECK (gross_amount >= 0 AND iva_amount >= 0 AND net_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(DATE_TRUNC('month', transaction_date));
CREATE INDEX IF NOT EXISTS idx_transactions_ruc ON transactions(ruc_counterpart);

-- ============================================
-- TABLA: tax_obligations
-- ============================================
CREATE TABLE IF NOT EXISTS tax_obligations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tax_type VARCHAR(10) NOT NULL CHECK (tax_type IN ('IVA', 'IRP')),
    fiscal_period DATE NOT NULL,
    due_date DATE NOT NULL,
    debito_fiscal NUMERIC(15,2) DEFAULT 0,
    credito_fiscal NUMERIC(15,2) DEFAULT 0,
    gross_income NUMERIC(15,2) DEFAULT 0,
    deductible_expenses NUMERIC(15,2) DEFAULT 0,
    net_income NUMERIC(15,2) DEFAULT 0,
    calculated_tax NUMERIC(15,2) NOT NULL,
    withholdings_amount NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING',
    paid_date DATE,
    payment_method VARCHAR(50),
    confirmation_number VARCHAR(100),
    payment_receipt TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tax_obligations_user_type ON tax_obligations(user_id, tax_type);
CREATE INDEX IF NOT EXISTS idx_tax_obligations_period ON tax_obligations(fiscal_period);
CREATE INDEX IF NOT EXISTS idx_tax_obligations_due_date ON tax_obligations(due_date);
CREATE INDEX IF NOT EXISTS idx_tax_obligations_status ON tax_obligations(status);

-- ============================================
-- TABLA: notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_obligation_id UUID REFERENCES tax_obligations(id),
    related_data JSONB,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    send_email BOOLEAN DEFAULT false,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- TABLA: scraper_sessions
-- ============================================
CREATE TABLE IF NOT EXISTS scraper_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scrape_type VARCHAR(50) NOT NULL,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    total_found INTEGER DEFAULT 0,
    total_imported INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    results JSONB,
    error_log TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scraper_sessions_user ON scraper_sessions(user_id, created_at DESC);

-- ============================================
-- TABLA: system_settings
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    marangatu_username VARCHAR(255),
    marangatu_password_encrypted TEXT,
    auto_scrape_enabled BOOLEAN DEFAULT false,
    auto_scrape_frequency VARCHAR(20) DEFAULT 'WEEKLY',
    last_scrape_date TIMESTAMP,
    email_notifications BOOLEAN DEFAULT true,
    notification_days_before JSONB DEFAULT '[7, 3, 1]',
    auto_categorize_enabled BOOLEAN DEFAULT true,
    known_suppliers JSONB DEFAULT '[]',
    set_apikey VARCHAR(255),
    default_iva_rate NUMERIC(5,2) DEFAULT 10.00,
    fiscal_year_start INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_settings UNIQUE(user_id)
);

-- ============================================
-- TABLA: deduction_categories
-- ============================================
CREATE TABLE IF NOT EXISTS deduction_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    applies_to_iva BOOLEAN DEFAULT false,
    applies_to_irp BOOLEAN DEFAULT false,
    iva_deduction_percentage INTEGER DEFAULT 0,
    legal_reference TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO deduction_categories (code, name, description, applies_to_iva, applies_to_irp, iva_deduction_percentage, legal_reference) VALUES
('oficina_exclusiva', 'Oficina de uso exclusivo', 'Arrendamiento, servicios públicos y gastos de oficina exclusiva para la actividad profesional', true, true, 100, 'Art. 19 Decreto 3107/2019, modificado por Decreto 8175/2022'),
('salud_personal', 'Salud personal', 'Medicamentos, tratamientos, consultas médicas', true, true, 100, 'Art. 19 Decreto 3107/2019'),
('capacitacion', 'Capacitación profesional', 'Cursos, seminarios, congresos relacionados con la actividad', true, true, 100, 'Art. 19 Decreto 3107/2019'),
('utiles_equipos', 'Útiles y equipamiento', 'Material de oficina, mobiliario, equipos informáticos', true, true, 100, 'Art. 19 Decreto 3107/2019'),
('vestimenta_profesional', 'Vestimenta profesional', 'Vestimenta específica requerida para la actividad', true, true, 100, 'Art. 19 Decreto 3107/2019'),
('publicidad', 'Publicidad y marketing', 'Servicios de publicidad, marketing, diseño gráfico', true, true, 100, 'Art. 19 Decreto 3107/2019'),
('subcontratacion', 'Subcontratación de servicios', 'Servicios profesionales subcontratados', true, true, 100, 'Art. 19 Decreto 3107/2019'),
('vehiculo_operativo', 'Gastos operativos de vehículo', 'Combustible, repuestos, mantenimiento, seguros', true, true, 100, 'Art. 19 Decreto 3107/2019'),
('servicios_mixtos', 'Servicios públicos uso mixto', 'Electricidad, agua, telefonía de uso mixto personal/profesional', true, true, 50, 'Art. 19 Decreto 3107/2019'),
('alquiler_mixto', 'Arrendamiento uso mixto', 'Arrendamiento de inmueble de uso mixto', true, true, 50, 'Art. 19 Decreto 3107/2019'),
('alimentos_bebidas', 'Alimentos y bebidas no alcohólicas', 'Alimentos y bebidas consumidas en actividad profesional', true, true, 30, 'Art. 19 Decreto 3107/2019'),
('vehiculo_compra', 'Compra de autovehículo', 'Adquisición de vehículo para uso profesional', true, true, 30, 'Art. 19 Decreto 3107/2019'),
('gastos_personales', 'Gastos personales y familiares', 'Gastos personales deducibles solo para IRP', false, true, 0, 'Art. 64 Ley 6380/2019'),
('no_deducible', 'No deducible', 'Gastos no deducibles en ningún impuesto', false, false, 0, 'N/A')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- TABLA: audit_log
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- ============================================
-- VISTAS MATERIALIZADAS
-- ============================================

-- Vista: Resumen mensual de IVA
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_iva_summary AS
SELECT 
    user_id,
    DATE_TRUNC('month', transaction_date) as period,
    SUM(CASE WHEN type = 'INGRESO' THEN iva_amount ELSE 0 END) as debito_fiscal,
    SUM(CASE WHEN type = 'EGRESO' AND is_creditable_iva = true 
        THEN creditable_iva_amount ELSE 0 END) as credito_fiscal,
    SUM(CASE WHEN type = 'INGRESO' THEN iva_amount ELSE 0 END) -
    SUM(CASE WHEN type = 'EGRESO' AND is_creditable_iva = true 
        THEN creditable_iva_amount ELSE 0 END) as saldo_iva,
    SUM(CASE WHEN type = 'INGRESO' THEN gross_amount ELSE 0 END) as total_ingresos,
    SUM(CASE WHEN type = 'EGRESO' THEN gross_amount ELSE 0 END) as total_egresos,
    COUNT(CASE WHEN type = 'INGRESO' THEN 1 END) as qty_ingresos,
    COUNT(CASE WHEN type = 'EGRESO' THEN 1 END) as qty_egresos
FROM transactions
WHERE status = 'REGISTERED'
GROUP BY user_id, DATE_TRUNC('month', transaction_date);

CREATE UNIQUE INDEX IF NOT EXISTS mv_monthly_iva_summary_idx ON mv_monthly_iva_summary (user_id, period);

-- Vista: Resumen anual de IRP (CORREGIDA)
DROP MATERIALIZED VIEW IF EXISTS mv_annual_irp_summary;

CREATE MATERIALIZED VIEW mv_annual_irp_summary AS
WITH expenses AS (
    -- 1. Primero, calculamos la suma de gastos por categoría
    SELECT
        user_id,
        DATE_TRUNC('year', transaction_date) as fiscal_year,
        irp_deduction_category,
        SUM(net_amount) as total_expenses
    FROM transactions
    WHERE status = 'REGISTERED' 
      AND type = 'EGRESO' 
      AND is_deductible_irp = true 
      AND irp_deduction_category IS NOT NULL
    GROUP BY user_id, DATE_TRUNC('year', transaction_date), irp_deduction_category
),
totals AS (
    -- 2. Luego, calculamos los totales generales
    SELECT
        user_id,
        DATE_TRUNC('year', transaction_date) as fiscal_year,
        SUM(CASE WHEN type = 'INGRESO' THEN net_amount ELSE 0 END) as gross_income,
        SUM(CASE WHEN type = 'EGRESO' AND is_deductible_irp = true THEN net_amount ELSE 0 END) as deductible_expenses
    FROM transactions
    WHERE status = 'REGISTERED'
    GROUP BY user_id, DATE_TRUNC('year', transaction_date)
),
aggregated_expenses AS (
    -- 3. Agregamos los gastos (pre-sumados) en un JSON
    SELECT
        user_id,
        fiscal_year,
        jsonb_object_agg(irp_deduction_category, total_expenses) as expenses_by_category
    FROM expenses
    GROUP BY user_id, fiscal_year
)
-- 4. Finalmente, unimos los totales con el JSON
SELECT
    t.user_id,
    t.fiscal_year,
    t.gross_income,
    t.deductible_expenses,
    (t.gross_income - t.deductible_expenses) as net_income,
    COALESCE(ae.expenses_by_category, '{}'::jsonb) as expenses_by_category
FROM totals t
LEFT JOIN aggregated_expenses ae ON t.user_id = ae.user_id AND t.fiscal_year = ae.fiscal_year;

CREATE UNIQUE INDEX IF NOT EXISTS mv_annual_irp_summary_idx ON mv_annual_irp_summary (user_id, fiscal_year);


-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función: Calcular IRP según tramos progresivos
CREATE OR REPLACE FUNCTION calculate_irp(net_income NUMERIC) 
RETURNS NUMERIC AS $$
DECLARE
    tramo1 NUMERIC := 0;
    tramo2 NUMERIC := 0;
    tramo3 NUMERIC := 0;
BEGIN
    tramo1 := LEAST(net_income, 50000000) * 0.08;
    IF net_income > 50000000 THEN
        tramo2 := LEAST(net_income - 50000000, 100000000) * 0.09;
    END IF;
    IF net_income > 150000000 THEN
        tramo3 := (net_income - 150000000) * 0.10;
    END IF;
    RETURN tramo1 + tramo2 + tramo3;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función: Calcular próximo vencimiento (CORREGIDA)
DROP FUNCTION IF EXISTS get_next_due_date(integer, character varying, date);

CREATE OR REPLACE FUNCTION get_next_due_date(
    ruc_ending INTEGER, 
    tax_type VARCHAR, 
    reference_date DATE  -- Eliminado DEFAULT CURRENT_DATE
) RETURNS DATE AS $$
DECLARE
    due_day INTEGER;
    next_due DATE;
BEGIN
    due_day := CASE ruc_ending
        WHEN 0 THEN 7  WHEN 1 THEN 9  WHEN 2 THEN 11
        WHEN 3 THEN 13 WHEN 4 THEN 15 WHEN 5 THEN 17
        WHEN 6 THEN 19 WHEN 7 THEN 21 WHEN 8 THEN 23
        WHEN 9 THEN 25
    END;
    
    IF tax_type = 'IVA' THEN
        next_due := DATE_TRUNC('month', reference_date) + INTERVAL '1 month' + (due_day - 1) * INTERVAL '1 day';
    ELSIF tax_type = 'IRP' THEN
        next_due := DATE_TRUNC('year', reference_date) + INTERVAL '1 year' + INTERVAL '2 months' + (due_day - 1) * INTERVAL '1 day';
    END IF;
    
    IF EXTRACT(DOW FROM next_due) = 6 THEN
        next_due := next_due + INTERVAL '2 days';
    ELSIF EXTRACT(DOW FROM next_due) = 0 THEN
        next_due := next_due + INTERVAL '1 day';
    END IF;
    
    RETURN next_due;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tax_obligations_updated_at ON tax_obligations;
CREATE TRIGGER update_tax_obligations_updated_at BEFORE UPDATE ON tax_obligations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Calcular automáticamente creditable_iva_amount
CREATE OR REPLACE FUNCTION calculate_creditable_iva()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'EGRESO' AND NEW.is_creditable_iva = true THEN
        NEW.creditable_iva_amount := NEW.iva_amount * (NEW.iva_deduction_percentage / 100.0);
    ELSE
        NEW.creditable_iva_amount := 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_creditable_iva_trigger ON transactions;
CREATE TRIGGER calculate_creditable_iva_trigger BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION calculate_creditable_iva();

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Usuario demo (contraseña: demo123456)
INSERT INTO users (email, password_hash, ruc, dv, full_name, activity_type)
VALUES (
    'demo@taxsystem.py',
    '$2b$10$rXKZ7JZjH5LqQxYvP9Xzm.eGJ9B8H3qQvTr2xYwJZKt4vN5Lz6Fxm', -- demo1s23456
    '4895448',
    '9',
    'SILVIO ANDRES SOTELO',
    'SERVICIOS_PROFESIONALES'
) ON CONFLICT (email) DO NOTHING;

-- Configuración inicial del sistema
INSERT INTO system_settings (user_id, email_notifications, auto_categorize_enabled)
SELECT id, true, true FROM users WHERE email = 'demo@taxsystem.py'
ON CONFLICT (user_id) DO NOTHING;

-- Comentario final sobre la BD
COMMENT ON DATABASE tax_system_py IS 'Sistema de Gestión Tributaria Paraguay - Base de datos principal';