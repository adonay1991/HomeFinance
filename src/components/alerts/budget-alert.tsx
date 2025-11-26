'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CURRENCY_SYMBOL, BUDGET_WARNING_THRESHOLD, BUDGET_DANGER_THRESHOLD } from '@/lib/constants'
import { AlertTriangle, AlertCircle, TrendingUp } from 'lucide-react'

// ==========================================
// ALERTA DE PRESUPUESTO
// ==========================================

type AlertLevel = 'warning' | 'danger' | 'exceeded'

interface BudgetAlertProps {
  spent: number
  budget: number
}

export function BudgetAlert({ spent, budget }: BudgetAlertProps) {
  const percentage = budget > 0 ? (spent / budget) * 100 : 0
  const remaining = budget - spent

  // Solo mostrar alerta si supera el 80%
  if (percentage < BUDGET_WARNING_THRESHOLD) {
    return null
  }

  // Determinar nivel de alerta
  let level: AlertLevel = 'warning'
  if (percentage > 100) {
    level = 'exceeded'
  } else if (percentage >= BUDGET_DANGER_THRESHOLD) {
    level = 'danger'
  }

  const config = {
    warning: {
      icon: AlertTriangle,
      title: '¡Atención al presupuesto!',
      className: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      iconClass: 'text-yellow-500',
    },
    danger: {
      icon: AlertCircle,
      title: 'Presupuesto al límite',
      className: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
      iconClass: 'text-red-500',
    },
    exceeded: {
      icon: TrendingUp,
      title: 'Presupuesto excedido',
      className: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
      iconClass: 'text-red-500',
    },
  }

  const { icon: Icon, title, className, iconClass } = config[level]

  const getMessage = () => {
    if (level === 'exceeded') {
      return `Has excedido tu presupuesto en ${Math.abs(remaining).toLocaleString('es-ES', { minimumFractionDigits: 2 })}${CURRENCY_SYMBOL}. Considera revisar tus gastos.`
    }

    if (level === 'danger') {
      return `Has usado el ${percentage.toFixed(0)}% de tu presupuesto. Solo te quedan ${remaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })}${CURRENCY_SYMBOL}.`
    }

    return `Has usado el ${percentage.toFixed(0)}% de tu presupuesto. Te quedan ${remaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })}${CURRENCY_SYMBOL} este mes.`
  }

  return (
    <Alert className={className}>
      <Icon className={`h-4 w-4 ${iconClass}`} />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{getMessage()}</AlertDescription>
    </Alert>
  )
}
