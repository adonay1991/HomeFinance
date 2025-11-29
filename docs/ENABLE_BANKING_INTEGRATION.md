# Plan de Integración: Enable Banking + HomeFinance

> **Estado**: Pendiente de registro en Enable Banking
> **Última actualización**: Noviembre 2025
> **Autor**: Generado con Claude Code

---

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Prerrequisitos](#prerrequisitos)
3. [Arquitectura de la Integración](#arquitectura-de-la-integración)
4. [Fase 1: Configuración Inicial](#fase-1-configuración-inicial)
5. [Fase 2: Flujo de Conexión Bancaria](#fase-2-flujo-de-conexión-bancaria)
6. [Fase 3: Sincronización de Transacciones](#fase-3-sincronización-de-transacciones)
7. [Fase 4: Gestión de Sesiones](#fase-4-gestión-de-sesiones)
8. [Esquema de Base de Datos](#esquema-de-base-de-datos)
9. [Endpoints API de HomeFinance](#endpoints-api-de-homefinance)
10. [Seguridad](#seguridad)
11. [Testing](#testing)
12. [Checklist de Implementación](#checklist-de-implementación)

---

## Resumen Ejecutivo

### ¿Qué es Enable Banking?

Enable Banking es una plataforma Open Banking europea que proporciona acceso a datos bancarios (cuentas, saldos, transacciones) a través de las APIs PSD2 oficiales de los bancos. Ofrece:

- **2,500+ bancos** en 29 países europeos
- **Free tier** para cuentas vinculadas
- **SDK JavaScript/Python** disponible
- **PSD2 compliant** - conexión directa a APIs bancarias

### Objetivo de la Integración

Permitir que los usuarios de HomeFinance conecten sus cuentas bancarias españolas para:

1. **Importar transacciones automáticamente** en lugar de añadirlas manualmente
2. **Categorizar gastos** basándose en la información del comercio
3. **Sincronizar saldos** para tener una visión completa de las finanzas

### Diferencias con GoCardless/Nordigen

| Aspecto | GoCardless | Enable Banking |
|---------|------------|----------------|
| Autenticación API | Access Token + Refresh Token | JWT con clave RSA privada |
| Concepto principal | Requisitions | Sessions |
| Validez acceso | 90 días | Configurable (hasta 180 días) |
| Registro | Ya no acepta nuevos usuarios | Abierto |

---

## Prerrequisitos

### Para el Desarrollador

- [ ] Cuenta en [Enable Banking](https://enablebanking.com/sign-in/)
- [ ] Aplicación registrada en el Control Panel
- [ ] Clave privada RSA descargada (archivo `.pem`)
- [ ] Entorno Sandbox activado para pruebas

### Credenciales Necesarias

```env
# .env.local
ENABLE_BANKING_APP_ID=tu-application-id-uuid
ENABLE_BANKING_PRIVATE_KEY_PATH=./keys/enablebanking.pem
# O almacenar la clave directamente (escapar saltos de línea)
ENABLE_BANKING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"
```

### Dependencias a Instalar

```bash
bun add jsonwebtoken jose
```

---

## Arquitectura de la Integración

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOMEFINANCE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Frontend   │────▶│  API Routes  │────▶│   Supabase   │    │
│  │   (React)    │     │  (Next.js)   │     │     (DB)     │    │
│  └──────────────┘     └──────┬───────┘     └──────────────┘    │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  Enable Banking  │
                    │       API        │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         ┌────────┐    ┌────────┐    ┌────────┐
         │ BBVA   │    │CaixaB. │    │Openbank│
         └────────┘    └────────┘    └────────┘
```

### Flujo de Datos

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant B as API Routes
    participant DB as Supabase
    participant EB as Enable Banking
    participant Bank as Banco

    Note over U,Bank: CONEXIÓN INICIAL

    U->>F: Click "Conectar banco"
    F->>B: GET /api/bank/institutions?country=ES
    B->>EB: GET /aspsps?country=ES
    EB-->>B: Lista de bancos españoles
    B-->>F: [{name: "BBVA", ...}, ...]
    F->>U: Mostrar selector de bancos

    U->>F: Selecciona "Openbank"
    F->>B: POST /api/bank/connect {aspsp: "Openbank"}
    B->>EB: POST /auth {aspsp, redirect_url, ...}
    EB-->>B: {url: "https://...", state: "xxx"}
    B->>DB: Guardar state (pendiente)
    B-->>F: {auth_url: "https://..."}
    F->>U: Redirigir a Enable Banking

    U->>EB: Abrir URL de autorización
    EB->>Bank: Redirigir al banco
    U->>Bank: Login + Autorizar
    Bank-->>EB: OK
    EB-->>U: Redirigir a /api/bank/callback?code=xxx

    U->>B: GET /api/bank/callback?code=xxx&state=xxx
    B->>DB: Verificar state
    B->>EB: POST /sessions {code: "xxx"}
    EB-->>B: {session_id, accounts: [...]}
    B->>DB: Guardar session + accounts
    B-->>F: Redirigir a /settings ✅

    Note over U,Bank: SINCRONIZACIÓN DIARIA

    U->>F: Abrir Dashboard
    F->>B: GET /api/bank/sync
    B->>DB: Obtener session_id + accounts
    B->>EB: GET /accounts/{uid}/transactions
    EB-->>B: {transactions: [...]}
    B->>DB: Insertar nuevas transacciones
    B-->>F: {synced: 15, new: 3}
    F->>U: Mostrar gastos actualizados
```

---

## Fase 1: Configuración Inicial

### 1.1 Registro en Enable Banking

1. Ve a [enablebanking.com/sign-in](https://enablebanking.com/sign-in/)
2. Introduce tu email - recibirás un magic link
3. Accede al **Control Panel**

### 1.2 Crear Aplicación

1. Ve a **API Applications** → **Register New Application**
2. Configura:
   - **Environment**: `Sandbox` (para pruebas)
   - **Application Name**: `HomeFinance`
   - **Redirect URLs**:
     - `http://localhost:3000/api/bank/callback` (desarrollo)
     - `https://tu-dominio.vercel.app/api/bank/callback` (producción)
3. **Descarga la clave privada** (archivo `.pem`) - ¡guárdala segura!
4. Copia el **Application ID**

### 1.3 Estructura de Archivos

```
src/
├── lib/
│   └── enablebanking/
│       ├── client.ts        # Cliente API con JWT auth
│       ├── types.ts         # Tipos TypeScript
│       └── utils.ts         # Helpers (mapeo de transacciones)
├── app/
│   └── api/
│       └── bank/
│           ├── institutions/route.ts  # Lista de bancos
│           ├── connect/route.ts       # Iniciar conexión
│           ├── callback/route.ts      # Callback post-auth
│           ├── sync/route.ts          # Sincronizar transacciones
│           ├── status/route.ts        # Estado de conexión
│           └── disconnect/route.ts    # Desconectar banco
└── components/
    └── bank/
        ├── bank-connect.tsx           # UI de conexión
        ├── bank-selector.tsx          # Selector de bancos
        └── bank-status.tsx            # Estado de conexión
```

---

## Fase 2: Flujo de Conexión Bancaria

### 2.1 Cliente Enable Banking

```typescript
// src/lib/enablebanking/client.ts

import * as jose from 'jose'

const ENABLE_BANKING_API = 'https://api.enablebanking.com'

export class EnableBankingClient {
  private appId: string
  private privateKey: string

  constructor() {
    this.appId = process.env.ENABLE_BANKING_APP_ID!
    this.privateKey = process.env.ENABLE_BANKING_PRIVATE_KEY!
  }

  // Generar JWT para autenticación
  private async generateJWT(): Promise<string> {
    const privateKey = await jose.importPKCS8(this.privateKey, 'RS256')

    const jwt = await new jose.SignJWT({})
      .setProtectedHeader({
        alg: 'RS256',
        kid: this.appId  // Application ID en el header
      })
      .setIssuer('enablebanking.com')
      .setAudience('api.enablebanking.com')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey)

    return jwt
  }

  // Request genérico con auth
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const jwt = await this.generateJWT()

    const response = await fetch(`${ENABLE_BANKING_API}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Enable Banking API error: ${error}`)
    }

    return response.json()
  }

  // Obtener lista de bancos por país
  async getInstitutions(country: string): Promise<ASPSP[]> {
    return this.request('GET', `/aspsps?country=${country}`)
  }

  // Iniciar autorización
  async startAuth(params: AuthParams): Promise<AuthResponse> {
    return this.request('POST', '/auth', {
      access: {
        valid_until: params.validUntil, // ISO date string
      },
      aspsp: {
        name: params.bankName,
        country: params.country,
      },
      state: params.state,
      redirect_url: params.redirectUrl,
      psu_type: 'personal', // personal o business
    })
  }

  // Crear sesión después del callback
  async createSession(code: string): Promise<SessionResponse> {
    return this.request('POST', '/sessions', { code })
  }

  // Obtener transacciones de una cuenta
  async getTransactions(
    accountUid: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<TransactionsResponse> {
    let endpoint = `/accounts/${accountUid}/transactions`
    const params = new URLSearchParams()
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    if (params.toString()) endpoint += `?${params}`

    return this.request('GET', endpoint)
  }

  // Obtener saldos de una cuenta
  async getBalances(accountUid: string): Promise<BalancesResponse> {
    return this.request('GET', `/accounts/${accountUid}/balances`)
  }
}

export const enableBanking = new EnableBankingClient()
```

### 2.2 Tipos TypeScript

```typescript
// src/lib/enablebanking/types.ts

export interface ASPSP {
  name: string
  country: string
  logo?: string
  bic?: string
  // Métodos de auth soportados
  auth_methods?: string[]
}

export interface AuthParams {
  bankName: string
  country: string
  state: string
  redirectUrl: string
  validUntil: string // ISO date, max 180 días
}

export interface AuthResponse {
  url: string  // URL para redirigir al usuario
}

export interface SessionResponse {
  session_id: string
  accounts: Account[]
  aspsp: {
    name: string
    country: string
  }
  // Fecha de expiración del acceso
  access_expires_at?: string
}

export interface Account {
  uid: string           // ID único de la cuenta
  iban?: string
  account_id?: string
  name?: string
  currency?: string
  account_type?: string // checking, savings, credit_card
}

export interface Transaction {
  transaction_id: string
  booking_date: string
  value_date?: string
  transaction_amount: {
    amount: string
    currency: string
  }
  creditor_name?: string
  creditor_account?: {
    iban?: string
  }
  debtor_name?: string
  debtor_account?: {
    iban?: string
  }
  remittance_information?: string
  bank_transaction_code?: string
  // Para categorización automática
  merchant_category_code?: string
}

export interface TransactionsResponse {
  transactions: {
    booked: Transaction[]
    pending?: Transaction[]
  }
}

export interface BalancesResponse {
  balances: {
    balance_amount: {
      amount: string
      currency: string
    }
    balance_type: string
    reference_date?: string
  }[]
}
```

### 2.3 API Routes

```typescript
// src/app/api/bank/institutions/route.ts

import { NextResponse } from 'next/server'
import { enableBanking } from '@/lib/enablebanking/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country') || 'ES'

  try {
    const institutions = await enableBanking.getInstitutions(country)
    return NextResponse.json(institutions)
  } catch (error) {
    console.error('Error fetching institutions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch institutions' },
      { status: 500 }
    )
  }
}
```

```typescript
// src/app/api/bank/connect/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enableBanking } from '@/lib/enablebanking/client'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { bankName, country = 'ES' } = await request.json()

    // Generar state único para verificar callback
    const state = randomUUID()

    // Calcular fecha de expiración (90 días)
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 90)

    // Determinar redirect URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
      || 'http://localhost:3000'

    // Iniciar autorización en Enable Banking
    const authResponse = await enableBanking.startAuth({
      bankName,
      country,
      state,
      redirectUrl: `${baseUrl}/api/bank/callback`,
      validUntil: validUntil.toISOString(),
    })

    // Guardar state pendiente en DB
    await supabase.from('bank_auth_states').insert({
      user_id: user.id,
      state,
      bank_name: bankName,
      country,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
    })

    return NextResponse.json({
      auth_url: authResponse.url,
      state
    })
  } catch (error) {
    console.error('Error starting bank connection:', error)
    return NextResponse.json(
      { error: 'Failed to start bank connection' },
      { status: 500 }
    )
  }
}
```

```typescript
// src/app/api/bank/callback/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enableBanking } from '@/lib/enablebanking/client'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Manejar errores de autorización
  if (error) {
    console.error('Bank auth error:', error)
    return NextResponse.redirect(
      `${origin}/settings?bank_error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/settings?bank_error=missing_params`
    )
  }

  const supabase = await createClient()

  try {
    // Verificar state y obtener user_id
    const { data: authState, error: stateError } = await supabase
      .from('bank_auth_states')
      .select('*')
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (stateError || !authState) {
      return NextResponse.redirect(
        `${origin}/settings?bank_error=invalid_state`
      )
    }

    // Crear sesión en Enable Banking
    const session = await enableBanking.createSession(code)

    // Guardar conexión bancaria
    const { data: connection } = await supabase
      .from('bank_connections')
      .insert({
        user_id: authState.user_id,
        session_id: session.session_id,
        bank_name: session.aspsp.name,
        country: session.aspsp.country,
        status: 'active',
        connected_at: new Date().toISOString(),
        expires_at: session.access_expires_at,
      })
      .select()
      .single()

    // Guardar cuentas vinculadas
    if (session.accounts && session.accounts.length > 0) {
      const accountsToInsert = session.accounts.map(acc => ({
        connection_id: connection.id,
        account_uid: acc.uid,
        iban: acc.iban,
        name: acc.name || 'Cuenta',
        currency: acc.currency || 'EUR',
        account_type: acc.account_type,
      }))

      await supabase.from('bank_accounts').insert(accountsToInsert)
    }

    // Limpiar state usado
    await supabase
      .from('bank_auth_states')
      .delete()
      .eq('state', state)

    // Redirigir con éxito
    return NextResponse.redirect(
      `${origin}/settings?bank_connected=true`
    )
  } catch (error) {
    console.error('Error in bank callback:', error)
    return NextResponse.redirect(
      `${origin}/settings?bank_error=connection_failed`
    )
  }
}
```

---

## Fase 3: Sincronización de Transacciones

### 3.1 Endpoint de Sincronización

```typescript
// src/app/api/bank/sync/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enableBanking } from '@/lib/enablebanking/client'
import { mapTransactionToExpense } from '@/lib/enablebanking/utils'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Obtener conexiones activas del usuario
    const { data: connections } = await supabase
      .from('bank_connections')
      .select(`
        *,
        bank_accounts (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        synced: 0,
        message: 'No bank connections found'
      })
    }

    let totalSynced = 0
    let totalNew = 0

    for (const connection of connections) {
      for (const account of connection.bank_accounts) {
        // Obtener última sincronización
        const { data: lastSync } = await supabase
          .from('bank_sync_log')
          .select('synced_at')
          .eq('account_id', account.id)
          .order('synced_at', { ascending: false })
          .limit(1)
          .single()

        // Calcular rango de fechas (desde última sync o últimos 30 días)
        const dateFrom = lastSync?.synced_at
          ? new Date(lastSync.synced_at).toISOString().split('T')[0]
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        // Obtener transacciones de Enable Banking
        const txResponse = await enableBanking.getTransactions(
          account.account_uid,
          dateFrom
        )

        const transactions = txResponse.transactions.booked || []

        // Filtrar transacciones que ya existen (por transaction_id)
        const existingTxIds = new Set()
        const { data: existingTx } = await supabase
          .from('bank_transactions')
          .select('external_id')
          .eq('account_id', account.id)

        existingTx?.forEach(tx => existingTxIds.add(tx.external_id))

        const newTransactions = transactions.filter(
          tx => !existingTxIds.has(tx.transaction_id)
        )

        // Insertar nuevas transacciones
        if (newTransactions.length > 0) {
          const toInsert = newTransactions.map(tx => ({
            account_id: account.id,
            external_id: tx.transaction_id,
            booking_date: tx.booking_date,
            amount: parseFloat(tx.transaction_amount.amount),
            currency: tx.transaction_amount.currency,
            creditor_name: tx.creditor_name,
            debtor_name: tx.debtor_name,
            description: tx.remittance_information,
            merchant_code: tx.merchant_category_code,
            raw_data: tx,
          }))

          await supabase.from('bank_transactions').insert(toInsert)
          totalNew += newTransactions.length
        }

        totalSynced += transactions.length

        // Registrar sincronización
        await supabase.from('bank_sync_log').insert({
          account_id: account.id,
          synced_at: new Date().toISOString(),
          transactions_fetched: transactions.length,
          transactions_new: newTransactions.length,
        })
      }
    }

    return NextResponse.json({
      synced: totalSynced,
      new: totalNew,
      message: `Synced ${totalSynced} transactions, ${totalNew} new`
    })
  } catch (error) {
    console.error('Error syncing transactions:', error)
    return NextResponse.json(
      { error: 'Failed to sync transactions' },
      { status: 500 }
    )
  }
}
```

### 3.2 Mapeo de Transacciones a Gastos

```typescript
// src/lib/enablebanking/utils.ts

import type { Transaction } from './types'
import type { CategoryKey } from '@/lib/constants'

// Mapeo de Merchant Category Codes (MCC) a categorías de HomeFinance
const MCC_TO_CATEGORY: Record<string, CategoryKey> = {
  // Comida y supermercados
  '5411': 'food',      // Grocery Stores
  '5412': 'food',      // Convenience Stores
  '5814': 'food',      // Fast Food
  '5812': 'food',      // Restaurants

  // Transporte
  '4111': 'transport', // Transportation
  '4121': 'transport', // Taxis
  '5541': 'transport', // Gas Stations
  '5542': 'transport', // Gas Stations

  // Facturas/Servicios
  '4900': 'bills',     // Utilities
  '4814': 'bills',     // Telecom
  '6300': 'bills',     // Insurance

  // Ocio
  '5813': 'leisure',   // Bars
  '7832': 'leisure',   // Movies
  '7941': 'leisure',   // Sports
  '5945': 'leisure',   // Hobbies
}

// Palabras clave para categorización por nombre de comercio
const KEYWORD_TO_CATEGORY: Record<string, CategoryKey> = {
  // Supermercados españoles
  'mercadona': 'food',
  'carrefour': 'food',
  'lidl': 'food',
  'aldi': 'food',
  'dia': 'food',
  'eroski': 'food',
  'alcampo': 'food',

  // Transporte
  'uber': 'transport',
  'cabify': 'transport',
  'renfe': 'transport',
  'metro': 'transport',
  'gasolinera': 'transport',
  'repsol': 'transport',
  'cepsa': 'transport',

  // Facturas
  'iberdrola': 'bills',
  'endesa': 'bills',
  'naturgy': 'bills',
  'vodafone': 'bills',
  'movistar': 'bills',
  'orange': 'bills',

  // Ocio
  'netflix': 'leisure',
  'spotify': 'leisure',
  'amazon prime': 'leisure',
  'cine': 'leisure',
}

export function categorizeTransaction(tx: Transaction): CategoryKey {
  // 1. Intentar por MCC
  if (tx.merchant_category_code) {
    const mccCategory = MCC_TO_CATEGORY[tx.merchant_category_code]
    if (mccCategory) return mccCategory
  }

  // 2. Intentar por nombre del comercio
  const merchantName = (
    tx.creditor_name ||
    tx.debtor_name ||
    tx.remittance_information ||
    ''
  ).toLowerCase()

  for (const [keyword, category] of Object.entries(KEYWORD_TO_CATEGORY)) {
    if (merchantName.includes(keyword)) {
      return category
    }
  }

  // 3. Default
  return 'other'
}

export function mapTransactionToExpense(
  tx: Transaction,
  userId: string,
  accountId: string
) {
  const amount = Math.abs(parseFloat(tx.transaction_amount.amount))
  const isExpense = parseFloat(tx.transaction_amount.amount) < 0

  return {
    user_id: userId,
    amount,
    description: tx.remittance_information || tx.creditor_name || 'Transacción bancaria',
    category: categorizeTransaction(tx),
    date: tx.booking_date,
    source: 'bank_sync',
    bank_account_id: accountId,
    bank_transaction_id: tx.transaction_id,
    is_expense: isExpense,
  }
}
```

---

## Fase 4: Gestión de Sesiones

### 4.1 Verificación de Estado

```typescript
// src/app/api/bank/status/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: connections } = await supabase
    .from('bank_connections')
    .select(`
      *,
      bank_accounts (*)
    `)
    .eq('user_id', user.id)
    .order('connected_at', { ascending: false })

  if (!connections || connections.length === 0) {
    return NextResponse.json({
      connected: false,
      connections: []
    })
  }

  // Calcular días restantes para cada conexión
  const connectionsWithStatus = connections.map(conn => {
    const expiresAt = new Date(conn.expires_at)
    const now = new Date()
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      ...conn,
      days_left: daysLeft,
      is_expired: daysLeft <= 0,
      needs_renewal: daysLeft <= 7 && daysLeft > 0,
    }
  })

  return NextResponse.json({
    connected: true,
    connections: connectionsWithStatus
  })
}
```

### 4.2 Desconexión

```typescript
// src/app/api/bank/disconnect/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { connectionId } = await request.json()

  // Verificar que la conexión pertenece al usuario
  const { data: connection } = await supabase
    .from('bank_connections')
    .select('id')
    .eq('id', connectionId)
    .eq('user_id', user.id)
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  // Eliminar conexión (cascade eliminará cuentas y transacciones)
  await supabase
    .from('bank_connections')
    .delete()
    .eq('id', connectionId)

  return NextResponse.json({ success: true })
}
```

---

## Esquema de Base de Datos

### Migraciones SQL para Supabase

```sql
-- Tabla: Estados de autorización pendientes
CREATE TABLE bank_auth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  state TEXT UNIQUE NOT NULL,
  bank_name TEXT NOT NULL,
  country TEXT DEFAULT 'ES',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para limpiar estados expirados
CREATE INDEX idx_bank_auth_states_expires ON bank_auth_states(expires_at);

-- Tabla: Conexiones bancarias
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  country TEXT DEFAULT 'ES',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'error')),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_connections_user ON bank_connections(user_id);
CREATE INDEX idx_bank_connections_status ON bank_connections(status);

-- Tabla: Cuentas bancarias vinculadas
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES bank_connections(id) ON DELETE CASCADE NOT NULL,
  account_uid TEXT NOT NULL, -- ID de Enable Banking
  iban TEXT,
  name TEXT,
  currency TEXT DEFAULT 'EUR',
  account_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_connection ON bank_accounts(connection_id);

-- Tabla: Transacciones bancarias (raw data)
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL, -- transaction_id de Enable Banking
  booking_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  creditor_name TEXT,
  debtor_name TEXT,
  description TEXT,
  merchant_code TEXT,
  raw_data JSONB, -- Datos completos para debug
  -- Vinculación con expenses (opcional)
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  is_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_bank_transactions_external ON bank_transactions(account_id, external_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(booking_date);
CREATE INDEX idx_bank_transactions_processed ON bank_transactions(is_processed);

-- Tabla: Log de sincronizaciones
CREATE TABLE bank_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  transactions_fetched INTEGER DEFAULT 0,
  transactions_new INTEGER DEFAULT 0,
  error TEXT
);

CREATE INDEX idx_bank_sync_log_account ON bank_sync_log(account_id);

-- RLS Policies
ALTER TABLE bank_auth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_sync_log ENABLE ROW LEVEL SECURITY;

-- Solo el usuario puede ver sus propios datos
CREATE POLICY "Users can view own auth states"
  ON bank_auth_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own connections"
  ON bank_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own accounts"
  ON bank_accounts FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM bank_connections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own transactions"
  ON bank_transactions FOR SELECT
  USING (
    account_id IN (
      SELECT ba.id FROM bank_accounts ba
      JOIN bank_connections bc ON ba.connection_id = bc.id
      WHERE bc.user_id = auth.uid()
    )
  );
```

---

## Endpoints API de HomeFinance

### Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/bank/institutions` | Lista bancos por país |
| `POST` | `/api/bank/connect` | Iniciar conexión bancaria |
| `GET` | `/api/bank/callback` | Callback post-autorización |
| `GET` | `/api/bank/status` | Estado de conexiones |
| `POST` | `/api/bank/sync` | Sincronizar transacciones |
| `DELETE` | `/api/bank/disconnect` | Desconectar banco |
| `GET` | `/api/bank/transactions` | Listar transacciones bancarias |
| `POST` | `/api/bank/transactions/import` | Importar a gastos |

---

## Seguridad

### Almacenamiento de Claves

```typescript
// La clave privada NUNCA debe estar en el código
// Opciones de almacenamiento seguro:

// 1. Variable de entorno (escapar saltos de línea)
ENABLE_BANKING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"

// 2. Archivo en servidor (no en repo)
ENABLE_BANKING_PRIVATE_KEY_PATH=/etc/secrets/enablebanking.pem

// 3. Secret manager (Vercel, AWS, etc.)
// Vercel: Settings > Environment Variables > Sensitive
```

### Consideraciones de Seguridad

1. **Nunca exponer session_id** al frontend
2. **Validar state** en callback para prevenir CSRF
3. **RLS habilitado** en todas las tablas bancarias
4. **Logs sin datos sensibles** (no loguear IBAN completo)
5. **HTTPS obligatorio** en producción
6. **Rate limiting** en endpoints de sync

---

## Testing

### Sandbox de Enable Banking

Enable Banking proporciona un entorno sandbox con bancos de prueba:

1. Registra tu app en modo **Sandbox**
2. Usa el banco de prueba `Sandbox Bank`
3. Credenciales de prueba: `customera` / `12345678`

### Tests Unitarios

```typescript
// __tests__/enablebanking/client.test.ts

import { EnableBankingClient } from '@/lib/enablebanking/client'

describe('EnableBankingClient', () => {
  it('should generate valid JWT', async () => {
    const client = new EnableBankingClient()
    // Test JWT generation
  })

  it('should fetch institutions', async () => {
    const client = new EnableBankingClient()
    const institutions = await client.getInstitutions('ES')
    expect(institutions).toBeInstanceOf(Array)
  })
})
```

---

## Checklist de Implementación

### Fase 0: Preparación
- [ ] Crear cuenta en Enable Banking
- [ ] Registrar aplicación en Sandbox
- [ ] Descargar clave privada (.pem)
- [ ] Configurar variables de entorno
- [ ] Instalar dependencias (`jose`)

### Fase 1: Backend Core
- [ ] Crear `src/lib/enablebanking/client.ts`
- [ ] Crear `src/lib/enablebanking/types.ts`
- [ ] Crear `src/lib/enablebanking/utils.ts`
- [ ] Ejecutar migraciones de base de datos

### Fase 2: API Routes
- [ ] `GET /api/bank/institutions`
- [ ] `POST /api/bank/connect`
- [ ] `GET /api/bank/callback`
- [ ] `GET /api/bank/status`
- [ ] `POST /api/bank/sync`
- [ ] `DELETE /api/bank/disconnect`

### Fase 3: Frontend
- [ ] Componente `BankConnect` (botón conectar)
- [ ] Componente `BankSelector` (lista de bancos)
- [ ] Componente `BankStatus` (estado de conexión)
- [ ] Integrar en página de Settings
- [ ] Mostrar transacciones bancarias

### Fase 4: Flujo Completo
- [ ] Probar conexión en Sandbox
- [ ] Probar sincronización de transacciones
- [ ] Probar importación a gastos
- [ ] Probar reconexión (90 días)

### Fase 5: Producción
- [ ] Registrar app en modo Production
- [ ] Verificar con Enable Banking (si aplica)
- [ ] Configurar redirect URL de producción
- [ ] Probar con banco real (cuenta propia)
- [ ] Monitorear errores y rate limits

---

## Recursos

- [Enable Banking Docs](https://enablebanking.com/docs/)
- [API Reference](https://enablebanking.com/docs/api/reference/)
- [Quick Start Guide](https://enablebanking.com/docs/api/quick-start/)
- [GitHub - Ejemplos](https://github.com/enablebanking)
- [Demo - Tilisy](https://tilisy.com/)

---

## Notas Adicionales

### Rate Limits

Los bancos pueden imponer límites de hasta **4 llamadas por día por cuenta**. Implementar:

1. **Caché de transacciones** en Supabase
2. **Sync incremental** (solo desde última fecha)
3. **Cola de sincronización** para múltiples cuentas

### Manejo de Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `401 Unauthorized` | JWT inválido o expirado | Regenerar JWT |
| `403 Forbidden` | App no activada | Contactar Enable Banking |
| `429 Too Many Requests` | Rate limit del banco | Implementar backoff |
| `session_expired` | Acceso de 90 días caducado | Re-autorizar usuario |

---

> **Siguiente paso**: Una vez tengas las credenciales de Enable Banking, avísame y comenzamos la implementación del código.
