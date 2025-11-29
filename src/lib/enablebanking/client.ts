import { SignJWT, importPKCS8 } from 'jose'
import type {
  Institution,
  AuthStartParams,
  AuthStartResponse,
  SessionResponse,
  Balance,
  TransactionsResponse,
  EnableBankingError,
} from './types'

// ==========================================
// CLIENTE ENABLE BANKING API
// ==========================================

const API_BASE = 'https://api.enablebanking.com'

/**
 * Cliente para interactuar con Enable Banking API.
 * Usa autenticación JWT firmada con clave privada RSA.
 *
 * El flujo típico es:
 * 1. getInstitutions() - obtener lista de bancos disponibles
 * 2. startAuth() - iniciar autorización, obtener URL de redirección
 * 3. createSession() - después del callback, crear sesión con el código
 * 4. getBalances() / getTransactions() - obtener datos de las cuentas
 */
export class EnableBankingClient {
  private appId: string
  private privateKey: string
  private cachedKey: CryptoKey | null = null

  constructor() {
    const appId = process.env.ENABLE_BANKING_APP_ID
    const privateKey = process.env.ENABLE_BANKING_PRIVATE_KEY

    if (!appId || !privateKey) {
      throw new Error('Enable Banking credentials not configured. Check ENABLE_BANKING_APP_ID and ENABLE_BANKING_PRIVATE_KEY')
    }

    this.appId = appId
    this.privateKey = privateKey
  }

  /**
   * Genera un JWT firmado para autenticación con Enable Banking.
   * El JWT usa RS256 y el Application ID va en el header "kid".
   */
  private async generateJWT(): Promise<string> {
    // Cachear la clave importada para mejor rendimiento
    if (!this.cachedKey) {
      this.cachedKey = await importPKCS8(this.privateKey, 'RS256')
    }

    const jwt = await new SignJWT({})
      .setProtectedHeader({
        alg: 'RS256',
        typ: 'JWT',
        kid: this.appId
      })
      .setIssuer('enablebanking.com')
      .setAudience('api.enablebanking.com')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(this.cachedKey)

    return jwt
  }

  /**
   * Realiza una petición autenticada a la API.
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const jwt = await this.generateJWT()

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[EnableBanking] API Error Response:', errorText)

      let error: EnableBankingError
      try {
        error = JSON.parse(errorText)
      } catch {
        error = {
          error: 'unknown',
          message: `HTTP ${response.status}: ${response.statusText}`,
        }
      }
      throw new Error(`Enable Banking API Error: ${error.message || error.error}`)
    }

    // Algunas respuestas pueden ser vacías (204)
    const text = await response.text()
    return text ? JSON.parse(text) as T : (null as unknown as T)
  }

  // ==========================================
  // INSTITUCIONES (BANCOS)
  // ==========================================

  /**
   * Obtiene la lista de instituciones bancarias disponibles.
   * @param country Código ISO del país (ej: "ES", "DE", "FR")
   */
  async getInstitutions(country: string): Promise<Institution[]> {
    const data = await this.request<{ aspsps: Institution[] }>(
      'GET',
      `/aspsps?country=${country.toUpperCase()}`
    )
    return data.aspsps || []
  }

  /**
   * Obtiene información de una institución específica.
   * @param aspsp Nombre completo del banco
   * @param country Código ISO del país
   */
  async getInstitution(aspsp: string, country: string): Promise<Institution | null> {
    const institutions = await this.getInstitutions(country)
    return institutions.find(i => i.fullName === aspsp) || null
  }

  // ==========================================
  // AUTORIZACIÓN
  // ==========================================

  /**
   * Inicia el proceso de autorización bancaria.
   * Retorna una URL a donde redirigir al usuario.
   *
   * @param params Parámetros de autorización
   * @returns URL de redirección al banco
   */
  async startAuth(params: AuthStartParams): Promise<AuthStartResponse> {
    const body = {
      aspsp: {
        name: params.aspsp,
        country: params.country,
      },
      state: params.state,
      redirect_url: params.redirectUrl,
      access: {
        valid_until: this.getValidUntilDate(90), // 90 días de acceso
        balances: true,
        transactions: true,
      },
      psu_type: params.psuType || 'personal',
    }

    console.log('[EnableBanking] startAuth body:', JSON.stringify(body, null, 2))

    return this.request<AuthStartResponse>('POST', '/auth', body)
  }

  /**
   * Crea una sesión después de que el usuario autoriza en el banco.
   * Se llama desde el callback con el código recibido.
   *
   * @param code Código recibido en el callback
   * @returns Información de sesión con cuentas disponibles
   */
  async createSession(code: string): Promise<SessionResponse> {
    const response = await this.request<{
      session_id: string
      accounts: Array<{
        uid: string
        iban?: string
        name?: string
        account_type?: string
        currency?: string
        owner_name?: string
        resource_id?: string
      }>
      valid_until: string
      aspsp: { name: string; country: string }
    }>('POST', '/sessions', { code })

    // Mapear respuesta a nuestros tipos
    return {
      sessionId: response.session_id,
      validUntil: response.valid_until,
      aspsp: response.aspsp.name,
      accounts: response.accounts.map(acc => ({
        uid: acc.uid,
        iban: acc.iban,
        name: acc.name,
        accountType: acc.account_type,
        currency: acc.currency,
        ownerName: acc.owner_name,
        resourceId: acc.resource_id,
      })),
    }
  }

  // ==========================================
  // CUENTAS Y TRANSACCIONES
  // ==========================================

  /**
   * Obtiene los balances de una cuenta.
   * @param accountUid UID de la cuenta
   */
  async getBalances(accountUid: string): Promise<Balance[]> {
    const data = await this.request<{
      balances: Array<{
        balance_type: string
        balance_amount: { amount: string; currency: string }
        reference_date?: string
      }>
    }>(
      'GET',
      `/accounts/${accountUid}/balances`
    )

    // Mapear de snake_case a camelCase
    return (data.balances || []).map(b => ({
      balanceType: b.balance_type as Balance['balanceType'],
      balanceAmount: b.balance_amount,
      referenceDate: b.reference_date,
    }))
  }

  /**
   * Obtiene las transacciones de una cuenta.
   *
   * @param accountUid UID de la cuenta
   * @param dateFrom Fecha desde (ISO format: YYYY-MM-DD)
   * @param dateTo Fecha hasta (ISO format: YYYY-MM-DD), default: hoy
   * @param continuationKey Token de paginación
   */
  async getTransactions(
    accountUid: string,
    dateFrom?: string,
    dateTo?: string,
    continuationKey?: string
  ): Promise<TransactionsResponse> {
    const params = new URLSearchParams()

    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)
    if (continuationKey) params.append('continuation_key', continuationKey)

    const queryString = params.toString()
    const endpoint = `/accounts/${accountUid}/transactions${queryString ? `?${queryString}` : ''}`

    const data = await this.request<{
      booked: Array<{
        transaction_id?: string
        internal_transaction_id?: string
        booking_date?: string
        value_date?: string
        transaction_amount: { amount: string; currency: string }
        creditor_name?: string
        creditor_iban?: string
        debtor_name?: string
        debtor_iban?: string
        remittance_information_unstructured?: string
        remittance_information_structured?: string
        merchant_category_code?: string
        additional_information?: string
        purpose_code?: string
        end_to_end_id?: string
        booking_status?: 'booked' | 'pending'
        bank_transaction_code?: string
        proprietary_bank_transaction_code?: string
      }>
      pending?: Array<unknown>
      continuation_key?: string
    }>('GET', endpoint)

    // Mapear respuesta a nuestros tipos (snake_case → camelCase)
    return {
      booked: (data.booked || []).map(tx => ({
        transactionId: tx.transaction_id,
        internalTransactionId: tx.internal_transaction_id,
        bookingDate: tx.booking_date,
        valueDate: tx.value_date,
        transactionAmount: tx.transaction_amount,
        creditorName: tx.creditor_name,
        creditorIban: tx.creditor_iban,
        debtorName: tx.debtor_name,
        debtorIban: tx.debtor_iban,
        remittanceInformationUnstructured: tx.remittance_information_unstructured,
        remittanceInformationStructured: tx.remittance_information_structured,
        merchantCategoryCode: tx.merchant_category_code,
        additionalInformation: tx.additional_information,
        purposeCode: tx.purpose_code,
        endToEndId: tx.end_to_end_id,
        bookingStatus: tx.booking_status,
        bankTransactionCode: tx.bank_transaction_code,
        proprietaryBankTransactionCode: tx.proprietary_bank_transaction_code,
      })),
      pending: data.pending as TransactionsResponse['pending'],
      continuationKey: data.continuation_key,
    }
  }

  /**
   * Obtiene todas las transacciones con paginación automática.
   */
  async getAllTransactions(
    accountUid: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<TransactionsResponse['booked']> {
    const allTransactions: TransactionsResponse['booked'] = []
    let continuationKey: string | undefined

    do {
      const response = await this.getTransactions(accountUid, dateFrom, dateTo, continuationKey)
      allTransactions.push(...response.booked)
      continuationKey = response.continuationKey
    } while (continuationKey)

    return allTransactions
  }

  // ==========================================
  // SESIONES
  // ==========================================

  /**
   * Obtiene información de una sesión existente.
   * Útil para verificar si la sesión sigue activa.
   */
  async getSession(sessionId: string): Promise<{ validUntil: string; status: string }> {
    return this.request<{ validUntil: string; status: string }>(
      'GET',
      `/sessions/${sessionId}`
    )
  }

  /**
   * Elimina una sesión (revoca acceso).
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.request<void>('DELETE', `/sessions/${sessionId}`)
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  /**
   * Calcula la fecha de validez (X días desde hoy).
   * Retorna en formato RFC3339 con offset (requerido por Enable Banking).
   * Ejemplo: 2025-12-01T12:00:00.000000+00:00
   */
  private getValidUntilDate(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() + days)
    // Convertir de ISO (Z) a RFC3339 con offset (+00:00)
    return date.toISOString().replace('Z', '+00:00')
  }
}

// Singleton del cliente
let clientInstance: EnableBankingClient | null = null

/**
 * Obtiene la instancia singleton del cliente Enable Banking.
 * Lanza error si las credenciales no están configuradas.
 */
export function getEnableBankingClient(): EnableBankingClient {
  if (!clientInstance) {
    clientInstance = new EnableBankingClient()
  }
  return clientInstance
}
