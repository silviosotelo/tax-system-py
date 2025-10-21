-- ============================================
-- SISTEMA DE GESTIÓN TRIBUTARIA - PARAGUAY
-- Base de datos PostgreSQL
-- ============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLA: users
-- Usuarios del sistema
-- ============================================
CREATE TABLE users (
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
-- Todas las transacciones (ingresos y egresos)
-- ============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Datos básicos
    transaction_date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INGRESO', 'EGRESO')),
    
    -- Documento
    document_type VARCHAR(50) NOT NULL, -- FACTURA_ELECTRONICA, FACTURA_VIRTUAL, TALONARIO, TICKET, RECIBO
    document_number VARCHAR(100),
    timbrado VARCHAR(20),
    cdc VARCHAR(50), -- Para facturas electrónicas
    
    -- Contraparte
    ruc_counterpart VARCHAR(20),
    dv_counterpart VARCHAR(2),
    name_counterpart VARCHAR(255),
    
    -- Montos
    gross_amount NUMERIC(15,2) NOT NULL, -- Monto total con IVA
    iva_rate NUMERIC(5,2) DEFAULT 10.00, -- 10% o 5%
    iva_amount NUMERIC(15,2) NOT NULL, -- IVA incluido
    net_amount NUMERIC(15,2) NOT NULL, -- Monto sin IVA
    
    -- Clasificación para IVA
    is_creditable_iva BOOLEAN DEFAULT false,
    iva_deduction_category VARCHAR(50), -- oficina, salud, capacitacion, etc.
    iva_deduction_percentage INTEGER DEFAULT 0, -- 0, 30, 50, 100
    creditable_iva_amount NUMERIC(15,2) DEFAULT 0, -- IVA efectivamente deducible
    
    -- Clasificación para IRP
    is_deductible_irp BOOLEAN DEFAULT false,
    irp_deduction_category VARCHAR(50), -- gastos_actividad, gastos_personales, etc.
    
    -- Metadatos
    description TEXT,
    notes TEXT,
    source VARCHAR(50) DEFAULT 'MANUAL', -- MANUAL, SCRAPER, IMPORT, API
    status VARCHAR(20) DEFAULT 'REGISTERED', -- REGISTERED, CONFIRMED, DISPUTED
    
    -- Control
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Índices
    CONSTRAINT valid_amounts CHECK (gross_amount > 0 AND net_amount > 0)
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_period ON transactions(DATE_TRUNC('month', transaction_date));
CREATE INDEX idx_transactions_ruc ON transactions(ruc_counterpart);

-- ============================================
-- TABLA: tax_obligations
-- Obligaciones tributarias (IVA mensual, IRP anual)
-- ============================================
CREATE TABLE tax_obligations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Identificación
    tax_type VARCHAR(10) NOT NULL CHECK (tax_type IN ('IVA', 'IRP')),
    fiscal_period DATE NOT NULL, -- Primer día del mes/año fiscal
    
    -- Vencimiento
    due_date DATE NOT NULL,
    
    -- Montos calculados
    debito_fiscal NUMERIC(15,2) DEFAULT 0, -- Solo para IVA
    credito_fiscal NUMERIC(15,2) DEFAULT 0, -- Solo para IVA
    gross_income NUMERIC(15,2) DEFAULT 0, -- Para IRP
    deductible_expenses NUMERIC(15,2) DEFAULT 0, -- Para IRP
    net_income NUMERIC(15,2) DEFAULT 0, -- Para IRP
    calculated_tax NUMERIC(15,2) NOT NULL,
    
    -- Retenciones
    withholdings_amount NUMERIC(15,2) DEFAULT 0,
    
    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PAID, OVERDUE, CANCELLED
    
    -- Pago
    paid_date DATE,
    payment_method VARCHAR(50),
    confirmation_number VARCHAR(100),
    payment_receipt TEXT, -- URL o path al comprobante
    
    -- Metadatos
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tax_obligations_user_type ON tax_obligations(user_id, tax_type);
CREATE INDEX idx_tax_obligations_period ON tax_obligations(fiscal_period);
CREATE INDEX idx_tax_obligations_due_date ON tax_obligations(due_date);
CREATE INDEX idx_tax_obligations_status ON tax_obligations(status);

-- ============================================
-- TABLA: notifications
-- Sistema de notificaciones y alertas
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tipo y prioridad
    type VARCHAR(50) NOT NULL, -- TAX_DUE, SCRAPER_SUCCESS, SCRAPER_ERROR, IMPORT_SUCCESS, etc.
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    
    -- Contenido
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Referencia
    related_obligation_id UUID REFERENCES tax_obligations(id),
    related_data JSONB, -- Datos adicionales en JSON
    
    -- Estado
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    
    -- Envío
    send_email BOOLEAN DEFAULT false,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP,
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- TABLA: scraper_sessions
-- Registro de sesiones de web scraping
-- ============================================
CREATE TABLE scraper_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Configuración
    scrape_type VARCHAR(50) NOT NULL, -- ISSUED_INVOICES, RECEIVED_INVOICES, BOTH
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    
    -- Estado
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    
    -- Resultados
    total_found INTEGER DEFAULT 0,
    total_imported INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    
    -- Datos
    results JSONB, -- Resultados detallados
    error_log TEXT,
    
    -- Timing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scraper_sessions_user ON scraper_sessions(user_id, created_at DESC);

-- ============================================
-- TABLA: system_settings
-- Configuraciones globales del sistema
-- ============================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Credenciales Marangatu (encriptadas)
    marangatu_username VARCHAR(255),
    marangatu_password_encrypted TEXT,
    
    -- Configuración de scraping
    auto_scrape_enabled BOOLEAN DEFAULT false,
    auto_scrape_frequency VARCHAR(20) DEFAULT 'WEEKLY', -- DAILY, WEEKLY, MONTHLY
    last_scrape_date TIMESTAMP,
    
    -- Notificaciones
    email_notifications BOOLEAN DEFAULT true,
    notification_days_before JSONB DEFAULT '[7, 3, 1]', -- Días antes del vencimiento
    
    -- Categorización automática
    auto_categorize_enabled BOOLEAN DEFAULT true,
    known_suppliers JSONB DEFAULT '[]', -- Lista de RUCs conocidos con categorías
    
    -- Integración API SET
    set_apikey VARCHAR(255),
    
    -- Preferencias de usuario
    default_iva_rate NUMERIC(5,2) DEFAULT 10.00,
    fiscal_year_start INTEGER DEFAULT 1, -- Mes de inicio del ejercicio fiscal
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_settings UNIQUE(user_id)
);

-- ============================================
-- TABLA: deduction_categories
-- Catálogo de categorías de deducción
-- ============================================
CREATE TABLE deduction_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Aplicabilidad
    applies_to_iva BOOLEAN DEFAULT false,
    applies_to_irp BOOLEAN DEFAULT false,
    
    -- Porcentajes de deducción IVA
    iva_deduction_percentage INTEGER DEFAULT 0, -- 0, 30, 50, 100
    
    -- Normativa
    legal_reference TEXT, -- Art. del Decreto 3107/2019, etc.
    
    -- Estado
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categorías predefinidas según Decreto 3107/2019 y 8175/2022
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
('no_deducible', 'No deducible', 'Gastos no deducibles en ningún impuesto', false, false, 0, 'N/A');

-- ============================================
-- TABLA: audit_log
-- Registro de auditoría de todas las operaciones
-- ============================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    
    -- Acción
    action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, SCRAPE, etc.
    entity_type VARCHAR(50), -- TRANSACTION, TAX_OBLIGATION, SETTING, etc.
    entity_id UUID,
    
    -- Datos
    old_values JSONB,
    new_values JSONB,
    
    -- Contexto
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- ============================================
-- VISTAS MATERIALIZADAS para optimizar consultas
-- ============================================

-- Vista: Resumen mensual de IVA
CREATE MATERIALIZED VIEW mv_monthly_iva_summary AS
SELECT 
    user_id,
    DATE_TRUNC('month', transaction_date) as period,
    
    -- Débito fiscal (ingresos)
    SUM(CASE WHEN type = 'INGRESO' THEN iva_amount ELSE 0 END) as debito_fiscal,
    
    -- Crédito fiscal (egresos deducibles)
    SUM(CASE WHEN type = 'EGRESO' AND is_creditable_iva = true 
        THEN creditable_iva_amount ELSE 0 END) as credito_fiscal,
    
    -- Saldo (débito - crédito)
    SUM(CASE WHEN type = 'INGRESO' THEN iva_amount ELSE 0 END) -
    SUM(CASE WHEN type = 'EGRESO' AND is_creditable_iva = true 
        THEN creditable_iva_amount ELSE 0 END) as saldo_iva,
    
    -- Totales
    SUM(CASE WHEN type = 'INGRESO' THEN gross_amount ELSE 0 END) as total_ingresos,
    SUM(CASE WHEN type = 'EGRESO' THEN gross_amount ELSE 0 END) as total_egresos,
    
    -- Contadores
    COUNT(CASE WHEN type = 'INGRESO' THEN 1 END) as qty_ingresos,
    COUNT(CASE WHEN type = 'EGRESO' THEN 1 END) as qty_egresos
FROM transactions
WHERE status = 'REGISTERED'
GROUP BY user_id, DATE_TRUNC('month', transaction_date);

CREATE UNIQUE INDEX ON mv_monthly_iva_summary (user_id, period);

-- Vista: Resumen anual de IRP
CREATE MATERIALIZED VIEW mv_annual_irp_summary AS
SELECT 
    user_id,
    DATE_TRUNC('year', transaction_date) as fiscal_year,
    
    -- Ingresos brutos
    SUM(CASE WHEN type = 'INGRESO' THEN net_amount ELSE 0 END) as gross_income,
    
    -- Gastos deducibles
    SUM(CASE WHEN type = 'EGRESO' AND is_deductible_irp = true 
        THEN net_amount ELSE 0 END) as deductible_expenses,
    
    -- Renta neta
    SUM(CASE WHEN type = 'INGRESO' THEN net_amount ELSE 0 END) -
    SUM(CASE WHEN type = 'EGRESO' AND is_deductible_irp = true 
        THEN net_amount ELSE 0 END) as net_income,
    
    -- Desglose de gastos por categoría
    jsonb_object_agg(
        irp_deduction_category, 
        SUM(CASE WHEN type = 'EGRESO' AND is_deductible_irp = true 
            THEN net_amount ELSE 0 END)
    ) FILTER (WHERE irp_deduction_category IS NOT NULL) as expenses_by_category
FROM transactions
WHERE status = 'REGISTERED'
GROUP BY user_id, DATE_TRUNC('year', transaction_date);

CREATE UNIQUE INDEX ON mv_annual_irp_summary (user_id, fiscal_year);

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
    -- Tramo 1: hasta 50.000.000 al 8%
    tramo1 := LEAST(net_income, 50000000) * 0.08;
    
    -- Tramo 2: de 50.000.001 a 150.000.000 al 9%
    IF net_income > 50000000 THEN
        tramo2 := LEAST(net_income - 50000000, 100000000) * 0.09;
    END IF;
    
    -- Tramo 3: más de 150.000.000 al 10%
    IF net_income > 150000000 THEN
        tramo3 := (net_income - 150000000) * 0.10;
    END IF;
    
    RETURN tramo1 + tramo2 + tramo3;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función: Calcular próximo vencimiento según terminación de RUC
CREATE OR REPLACE FUNCTION get_next_due_date(
    ruc_ending INTEGER, 
    tax_type VARCHAR, 
    reference_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE AS $$
DECLARE
    due_day INTEGER;
    next_due DATE;
BEGIN
    -- Día de vencimiento según último dígito del RUC
    due_day := CASE ruc_ending
        WHEN 0 THEN 7
        WHEN 1 THEN 9
        WHEN 2 THEN 11
        WHEN 3 THEN 13
        WHEN 4 THEN 15
        WHEN 5 THEN 17
        WHEN 6 THEN 19
        WHEN 7 THEN 21
        WHEN 8 THEN 23
        WHEN 9 THEN 25
    END;
    
    IF tax_type = 'IVA' THEN
        -- IVA: vence el día correspondiente del mes siguiente
        next_due := DATE_TRUNC('month', reference_date) + INTERVAL '1 month' + (due_day - 1) * INTERVAL '1 day';
    ELSIF tax_type = 'IRP' THEN
        -- IRP: vence el día correspondiente de marzo del año siguiente
        next_due := DATE_TRUNC('year', reference_date) + INTERVAL '1 year' + INTERVAL '2 months' + (due_day - 1) * INTERVAL '1 day';
    END IF;
    
    -- Si cae en sábado, mover a lunes
    IF EXTRACT(DOW FROM next_due) = 6 THEN
        next_due := next_due + INTERVAL '2 days';
    -- Si cae en domingo, mover a lunes
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

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_obligations_updated_at BEFORE UPDATE ON tax_obligations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER calculate_creditable_iva_trigger BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION calculate_creditable_iva();

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Usuario demo (contraseña: demo123456)
INSERT INTO users (email, password_hash, ruc, dv, full_name, activity_type)
VALUES (
    'demo@taxsystem.py',
    '$2b$10$rXKZ7JZjH5LqQxYvP9Xzm.eGJ9B8H3qQvTr2xYwJZKt4vN5Lz6Fxm', -- demo123456
    '4895448',
    '9',
    'SILVIO ANDRES SOTELO',
    'SERVICIOS_PROFESIONALES'
);

-- Configuración inicial del sistema
INSERT INTO system_settings (user_id, email_notifications, auto_categorize_enabled)
SELECT id, true, true FROM users WHERE email = 'demo@taxsystem.py';

COMMENT ON DATABASE postgres IS 'Sistema de Gestión Tributaria Paraguay - Base de datos principal';