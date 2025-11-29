import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { CURRENCY_SYMBOL } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número como moneda con el símbolo configurado
 * @param amount - Cantidad a formatear
 * @param options - Opciones de formateo
 */
export function formatCurrency(
  amount: number,
  options?: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
    showSymbol?: boolean
  }
): string {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSymbol = true,
  } = options || {}

  const formatted = amount.toLocaleString('es-ES', {
    minimumFractionDigits,
    maximumFractionDigits,
  })

  return showSymbol ? `${formatted}${CURRENCY_SYMBOL}` : formatted
}
