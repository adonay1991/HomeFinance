import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Solo incluir el schema public (donde están nuestras tablas)
  schemaFilter: ['public'],
  // Verbose para mejor debugging
  verbose: true,
  // Strict mode para prevenir cambios accidentales
  strict: true,
})
