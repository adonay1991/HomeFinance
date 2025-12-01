-- ==========================================
-- TABLA: password_reset_codes
-- Códigos OTP para reset de contraseña
-- ==========================================

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON password_reset_codes(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires ON password_reset_codes(expires_at);

-- RLS: Permitir operaciones desde Server Actions
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Política: Permitir todas las operaciones para authenticated y anon
-- Las Server Actions de Next.js usan anon key pero ejecutan en servidor
CREATE POLICY "Allow server operations" ON password_reset_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comentario
COMMENT ON TABLE password_reset_codes IS 'Códigos OTP de 6 dígitos para recuperación de contraseña. Expiran en 10 minutos.';
