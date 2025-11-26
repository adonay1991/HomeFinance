// Categorías de gastos con colores e iconos
export const CATEGORIES = {
  comida: { label: 'Comida', color: '#22c55e', icon: 'Utensils' },
  facturas: { label: 'Facturas', color: '#3b82f6', icon: 'FileText' },
  transporte: { label: 'Transporte', color: '#f59e0b', icon: 'Car' },
  ocio: { label: 'Ocio', color: '#8b5cf6', icon: 'Gamepad2' },
  hogar: { label: 'Hogar', color: '#ec4899', icon: 'Home' },
  salud: { label: 'Salud', color: '#ef4444', icon: 'HeartPulse' },
  otros: { label: 'Otros', color: '#6b7280', icon: 'MoreHorizontal' },
} as const

export type CategoryKey = keyof typeof CATEGORIES

export const CATEGORY_LIST = Object.entries(CATEGORIES).map(([key, value]) => ({
  value: key as CategoryKey,
  ...value,
}))

// Configuración general
export const CURRENCY = 'EUR'
export const CURRENCY_SYMBOL = '€'
export const DEFAULT_HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001'

// Límites de alertas de presupuesto
export const BUDGET_WARNING_THRESHOLD = 80 // Porcentaje para alerta amarilla
export const BUDGET_DANGER_THRESHOLD = 100 // Porcentaje para alerta roja
