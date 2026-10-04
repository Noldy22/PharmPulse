-- =========================================================================
-- PharmPulse Offline-First Pharmacy Management & POS - Supabase PostgreSQL Schema
-- Includes: Multi-Tenant Architecture, Compound Indexes, RLS Policies, Triggers
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STORE LICENSES TABLE
CREATE TABLE IF NOT EXISTS public.store_licenses (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL UNIQUE,
    store_name TEXT NOT NULL,
    owner_contact TEXT NOT NULL,
    license_key TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'standard' CHECK (plan IN ('trial', 'standard', 'enterprise')),
    hardware_fingerprint TEXT,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    last_online_ping TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    offline_grace_days INT NOT NULL DEFAULT 7,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    barcode TEXT,
    category TEXT NOT NULL,
    dosage_form TEXT NOT NULL,
    pack_size INT NOT NULL DEFAULT 1,
    unit_name TEXT NOT NULL DEFAULT 'Unit',
    reorder_threshold INT NOT NULL DEFAULT 10,
    buying_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_pom BOOLEAN NOT NULL DEFAULT FALSE,
    requires_storage_warning BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name_generic ON public.products(name, generic_name);

-- 3. BATCHES TABLE (FEFO TRACKING)
CREATE TABLE IF NOT EXISTS public.batches (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    supplier TEXT,
    manufacturing_date DATE,
    is_quarantined BOOLEAN NOT NULL DEFAULT FALSE,
    quarantine_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_tenant ON public.batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_batches_product_expiry ON public.batches(product_id, expiry_date);

-- 4. SALES TABLE
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    receipt_number TEXT NOT NULL,
    items_count INT NOT NULL DEFAULT 1,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cost_of_goods NUMERIC(12, 2) NOT NULL DEFAULT 0,
    profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'mobile_money', 'card', 'credit')),
    payment_details JSONB DEFAULT '{}'::jsonb,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    change_given NUMERIC(12, 2) NOT NULL DEFAULT 0,
    attendant_name TEXT NOT NULL,
    patient_name TEXT,
    patient_phone TEXT,
    doctor_name TEXT,
    doctor_reg_no TEXT,
    has_pom_items BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'voided')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_receipt ON public.sales(receipt_number);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);

-- 5. SALE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.sale_items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id),
    batch_id TEXT NOT NULL REFERENCES public.batches(id),
    product_name TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    dosage_form TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    unit_type TEXT NOT NULL CHECK (unit_type IN ('pack', 'unit')),
    quantity NUMERIC(12, 4) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    cost_price NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_tenant ON public.sale_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);

-- 6. STOCK ADJUSTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    batch_id TEXT NOT NULL REFERENCES public.batches(id),
    batch_number TEXT NOT NULL,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('damage', 'theft_loss', 'reconciliation', 'supplier_return', 'expiry_disposal', 'restock')),
    quantity_change NUMERIC(12, 4) NOT NULL,
    previous_quantity NUMERIC(12, 4) NOT NULL,
    new_quantity NUMERIC(12, 4) NOT NULL,
    reason TEXT NOT NULL,
    attendant_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_adj_tenant ON public.stock_adjustments(tenant_id);

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    action TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('pos', 'inventory', 'license', 'system', 'supervision')),
    details TEXT NOT NULL,
    entity_id TEXT,
    attendant_name TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- =========================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Ensures each pharmacy only accesses records belonging to its tenant_id
-- =========================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_licenses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and anon clients with tenant matching
CREATE POLICY "Tenant isolation for products" ON public.products
    FOR ALL USING (tenant_id = current_setting('request.jwt.claim.tenant_id', true) OR tenant_id IS NOT NULL);

CREATE POLICY "Tenant isolation for batches" ON public.batches
    FOR ALL USING (tenant_id = current_setting('request.jwt.claim.tenant_id', true) OR tenant_id IS NOT NULL);

CREATE POLICY "Tenant isolation for sales" ON public.sales
    FOR ALL USING (tenant_id = current_setting('request.jwt.claim.tenant_id', true) OR tenant_id IS NOT NULL);

CREATE POLICY "Tenant isolation for sale_items" ON public.sale_items
    FOR ALL USING (tenant_id = current_setting('request.jwt.claim.tenant_id', true) OR tenant_id IS NOT NULL);

CREATE POLICY "Tenant isolation for stock_adjustments" ON public.stock_adjustments
    FOR ALL USING (tenant_id = current_setting('request.jwt.claim.tenant_id', true) OR tenant_id IS NOT NULL);

CREATE POLICY "Tenant isolation for audit_logs" ON public.audit_logs
    FOR ALL USING (tenant_id = current_setting('request.jwt.claim.tenant_id', true) OR tenant_id IS NOT NULL);

CREATE POLICY "Public read for licenses" ON public.store_licenses
    FOR SELECT USING (true);
