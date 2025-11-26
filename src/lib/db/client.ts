import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// ==========================================
// CLIENTE DRIZZLE PARA SUPABASE
// ==========================================
// Nota: Usamos la conexión directa de PostgreSQL
// en lugar del cliente REST de Supabase para
// mejor rendimiento y soporte completo de SQL

const connectionString = process.env.DATABASE_URL!

// Configuración del cliente postgres
// - max: 1 para serverless (cada invocación es efímera)
// - idle_timeout: 20s para liberar conexiones rápido
const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

// Exportamos el cliente Drizzle con el schema tipado
export const db = drizzle(client, { schema })

// Re-exportamos el schema para conveniencia
export * from './schema'
