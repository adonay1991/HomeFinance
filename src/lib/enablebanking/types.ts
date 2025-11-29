// ==========================================
// TIPOS PARA ENABLE BANKING API
// ==========================================

/**
 * Institución bancaria (ASPSP = Account Servicing Payment Service Provider)
 */
export interface Institution {
  name: string
  country: string
  /** Nombre único del banco para usar en auth */
  fullName: string
  logo?: string
  /** Máximo días de historial de transacciones disponible */
  transactionTotalDays?: number
  /** Si soporta PSU (usuario) IP address */
  psuIpAddressRequired?: boolean
}

/**
 * Parámetros para iniciar autorización bancaria
 */
export interface AuthStartParams {
  /** Nombre completo del banco (ej: "Sandbox Bank") */
  aspsp: string
  /** Código de país ISO (ej: "ES", "DE") */
  country: string
  /** Estado único para prevenir CSRF */
  state: string
  /** URL de retorno después de auth */
  redirectUrl: string
  /** Accesos solicitados */
  access: {
    /** Acceso a lista de cuentas (siempre true) */
    balances: boolean
    /** Acceso a transacciones */
    transactions: boolean
  }
  /** IP del usuario (requerido por algunos bancos) */
  psuIpAddress?: string
  /** Tipo de PSU: personal o business */
  psuType?: 'personal' | 'business'
}

/**
 * Respuesta al iniciar autorización
 */
export interface AuthStartResponse {
  /** URL a donde redirigir al usuario para autorizar */
  url: string
}

/**
 * Respuesta al crear sesión (después del callback)
 */
export interface SessionResponse {
  /** ID único de la sesión */
  sessionId: string
  /** Cuentas disponibles */
  accounts: AccountInfo[]
  /** Cuándo expira la sesión */
  validUntil: string
  /** ASPSP del que viene la sesión */
  aspsp: string
}

/**
 * Información de cuenta bancaria
 */
export interface AccountInfo {
  /** ID único de la cuenta en Enable Banking */
  uid: string
  /** IBAN */
  iban?: string
  /** Nombre de la cuenta */
  name?: string
  /** Tipo de cuenta */
  accountType?: string
  /** Moneda (EUR, USD, etc) */
  currency?: string
  /** Nombre del titular */
  ownerName?: string
  /** Identificador adicional del banco */
  resourceId?: string
}

/**
 * Balance de cuenta
 */
export interface Balance {
  /** Nombre del tipo de balance */
  balanceType: 'closingAvailable' | 'closingBooked' | 'expected' | 'interimAvailable' | 'interimBooked' | 'openingBooked'
  /** Información del monto */
  balanceAmount: {
    amount: string
    currency: string
  }
  /** Fecha de referencia */
  referenceDate?: string
}

/**
 * Transacción bancaria
 */
export interface Transaction {
  /** ID único de la transacción */
  transactionId?: string
  /** ID de referencia interna */
  internalTransactionId?: string
  /** Fecha de reserva (booking) */
  bookingDate?: string
  /** Fecha de valor */
  valueDate?: string
  /** Monto */
  transactionAmount: {
    amount: string
    currency: string
  }
  /** Nombre del acreedor (a quien se paga) */
  creditorName?: string
  /** IBAN del acreedor */
  creditorIban?: string
  /** Nombre del deudor (quien paga) */
  debtorName?: string
  /** IBAN del deudor */
  debtorIban?: string
  /** Información de remitente */
  remittanceInformationUnstructured?: string
  /** Información de remitente estructurada */
  remittanceInformationStructured?: string
  /** Código MCC del comercio (Merchant Category Code) */
  merchantCategoryCode?: string
  /** Referencia adicional */
  additionalInformation?: string
  /** Propósito del pago */
  purposeCode?: string
  /** Referencia end-to-end */
  endToEndId?: string
  /** Estado de la transacción */
  bookingStatus?: 'booked' | 'pending'
  /** Información del banco */
  bankTransactionCode?: string
  /** Referencia propietaria */
  proprietaryBankTransactionCode?: string
}

/**
 * Respuesta de transacciones
 */
export interface TransactionsResponse {
  /** Transacciones reservadas (confirmadas) */
  booked: Transaction[]
  /** Transacciones pendientes */
  pending?: Transaction[]
  /** Continuación para paginación */
  continuationKey?: string
}

/**
 * Error de la API
 */
export interface EnableBankingError {
  error: string
  message: string
  details?: string
}

// ==========================================
// TIPOS PARA BASE DE DATOS LOCAL
// ==========================================

/**
 * Estado de autenticación pendiente (temporal)
 */
export interface BankAuthState {
  id: string
  userId: string
  state: string
  bankName: string
  country: string
  expiresAt: Date
  createdAt: Date
}

/**
 * Conexión bancaria activa
 */
export interface BankConnection {
  id: string
  userId: string
  sessionId: string
  bankName: string
  country: string
  status: 'active' | 'expired' | 'error'
  connectedAt: Date
  expiresAt?: Date
  lastSyncedAt?: Date
  createdAt: Date
}

/**
 * Cuenta bancaria vinculada
 */
export interface BankAccount {
  id: string
  connectionId: string
  accountUid: string
  iban?: string
  name?: string
  currency: string
  accountType?: string
  createdAt: Date
}

/**
 * Transacción bancaria raw
 */
export interface BankTransaction {
  id: string
  accountId: string
  externalId: string
  bookingDate: string
  amount: number
  currency: string
  creditorName?: string
  debtorName?: string
  description?: string
  merchantCode?: string
  rawData: unknown
  expenseId?: string
  isProcessed: boolean
  createdAt: Date
}

/**
 * Resultado de sincronización
 */
export interface SyncResult {
  accountId: string
  accountName?: string
  transactionsFetched: number
  transactionsNew: number
  expensesCreated: number
  errors?: string[]
}
