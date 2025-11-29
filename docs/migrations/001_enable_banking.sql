-- ==========================================
-- MIGRACIÓN: Enable Banking Integration
-- Fecha: 2024
-- Descripción: Añade tablas para integración con Enable Banking API
-- ==========================================

-- ==========================================
-- 1. MODIFICAR TABLA expenses
-- Añadir columnas para identificar origen de gastos
-- ==========================================

-- Columna source: indica si el gasto fue manual o sincronizado
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' NOT NULL;

-- Columna bank_transaction_id: referencia a la transacción bancaria original
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bank_transaction_id UUID;

-- Índice para filtrar por source
CREATE INDEX IF NOT EXISTS idx_expenses_source ON expenses(source);

-- ==========================================
-- 2. TABLA: bank_auth_states
-- Estados de autorización pendientes (temporal)
-- ==========================================
CREATE TABLE IF NOT EXISTS bank_auth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  state TEXT UNIQUE NOT NULL,
  bank_name TEXT NOT NULL,
  country TEXT DEFAULT 'ES',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_auth_states_user ON bank_auth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_auth_states_state ON bank_auth_states(state);

-- ==========================================
-- 3. TABLA: bank_connections
-- Conexiones bancarias activas
-- ==========================================
CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  country TEXT DEFAULT 'ES',
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'expired', 'error')),
  connected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_user ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections(status);

-- ==========================================
-- 4. TABLA: bank_accounts
-- Cuentas bancarias vinculadas
-- ==========================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES bank_connections(id) ON DELETE CASCADE NOT NULL,
  account_uid TEXT NOT NULL,
  iban TEXT,
  name TEXT,
  currency TEXT DEFAULT 'EUR',
  account_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection ON bank_accounts(connection_id);

-- ==========================================
-- 5. TABLA: bank_transactions
-- Transacciones bancarias (raw)
-- ==========================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL,
  booking_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  creditor_name TEXT,
  debtor_name TEXT,
  description TEXT,
  merchant_code TEXT,
  raw_data JSONB,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  is_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(account_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(booking_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_processed ON bank_transactions(is_processed);

-- Añadir foreign key de expenses a bank_transactions (ahora que existe la tabla)
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_bank_transaction
  FOREIGN KEY (bank_transaction_id) REFERENCES bank_transactions(id) ON DELETE SET NULL;

-- ==========================================
-- 6. TABLA: bank_sync_log
-- Log de sincronizaciones
-- ==========================================
CREATE TABLE IF NOT EXISTS bank_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  transactions_fetched INTEGER DEFAULT 0,
  transactions_new INTEGER DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_bank_sync_log_account ON bank_sync_log(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_sync_log_date ON bank_sync_log(synced_at);

-- ==========================================
-- 7. ROW LEVEL SECURITY (RLS)
-- Políticas de seguridad para todas las tablas
-- ==========================================

-- Enable RLS en todas las tablas
ALTER TABLE bank_auth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_sync_log ENABLE ROW LEVEL SECURITY;

-- Políticas para bank_auth_states
CREATE POLICY "Users own auth states" ON bank_auth_states
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para bank_connections
CREATE POLICY "Users own connections" ON bank_connections
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para bank_accounts (via connection)
CREATE POLICY "Users own accounts via connection" ON bank_accounts
  FOR ALL USING (
    connection_id IN (
      SELECT id FROM bank_connections WHERE user_id = auth.uid()
    )
  );

-- Políticas para bank_transactions (via account → connection)
CREATE POLICY "Users own transactions via account" ON bank_transactions
  FOR ALL USING (
    account_id IN (
      SELECT ba.id FROM bank_accounts ba
      JOIN bank_connections bc ON ba.connection_id = bc.id
      WHERE bc.user_id = auth.uid()
    )
  );

-- Políticas para bank_sync_log (via account → connection)
CREATE POLICY "Users own sync logs via account" ON bank_sync_log
  FOR ALL USING (
    account_id IN (
      SELECT ba.id FROM bank_accounts ba
      JOIN bank_connections bc ON ba.connection_id = bc.id
      WHERE bc.user_id = auth.uid()
    )
  );

-- ==========================================
-- 8. FUNCIÓN: Limpiar estados de auth expirados
-- Se puede ejecutar periódicamente con pg_cron
-- ==========================================
CREATE OR REPLACE FUNCTION cleanup_expired_bank_auth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM bank_auth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMENTARIOS
-- ==========================================
COMMENT ON TABLE bank_auth_states IS 'Estados temporales de autorización bancaria (CSRF protection)';
COMMENT ON TABLE bank_connections IS 'Conexiones activas con bancos via Enable Banking';
COMMENT ON TABLE bank_accounts IS 'Cuentas bancarias vinculadas a conexiones';
COMMENT ON TABLE bank_transactions IS 'Transacciones bancarias sincronizadas';
COMMENT ON TABLE bank_sync_log IS 'Historial de sincronizaciones';

COMMENT ON COLUMN expenses.source IS 'Origen del gasto: manual o bank_sync';
COMMENT ON COLUMN expenses.bank_transaction_id IS 'Referencia a transacción bancaria si fue sincronizado';
