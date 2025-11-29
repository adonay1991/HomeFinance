'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CURRENCY_SYMBOL } from '@/lib/constants'
import { ArrowUpDown } from 'lucide-react'

// ==========================================
// GRÁFICO COMPARATIVO: INGRESOS VS GASTOS
// Muestra barras verdes (ingresos) y rojas (gastos) por mes
// ==========================================

interface MonthData {
  month: string
  year: number
  monthNum: number
  income: number
  expenses: number
}

interface IncomeVsExpensesChartProps {
  data: MonthData[]
}

export function IncomeVsExpensesChart({ data }: IncomeVsExpensesChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" />
            Ingresos vs Gastos
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          <p className="text-sm">Sin datos para mostrar</p>
        </CardContent>
      </Card>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
    label
  }: {
    active?: boolean
    payload?: Array<{ value: number; dataKey: string; color: string }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      const income = payload.find(p => p.dataKey === 'income')?.value || 0
      const expenses = payload.find(p => p.dataKey === 'expenses')?.value || 0
      const balance = income - expenses

      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-green-600 dark:text-green-400">
              Ingresos: +{income.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
            </p>
            <p className="text-red-600 dark:text-red-400">
              Gastos: -{expenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
            </p>
            <div className="border-t pt-1 mt-1">
              <p className={balance >= 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                Balance: {balance >= 0 ? '+' : ''}{balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
              </p>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Calcular máximo para el eje Y
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.income, d.expenses))
  )
  const yAxisMax = Math.ceil(maxValue / 500) * 500 + 500

  // Calcular totales para el resumen
  const totalIncome = data.reduce((sum, d) => sum + d.income, 0)
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0)
  const netBalance = totalIncome - totalExpenses

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4" />
          Ingresos vs Gastos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}${CURRENCY_SYMBOL}`}
                domain={[0, yAxisMax]}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-foreground">
                    {value === 'income' ? 'Ingresos' : 'Gastos'}
                  </span>
                )}
              />
              <Bar
                dataKey="income"
                name="income"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
                maxBarSize={35}
              />
              <Bar
                dataKey="expenses"
                name="expenses"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={35}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resumen del período */}
        <div className="grid grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t">
          <div>
            <p className="text-muted-foreground text-xs">Total ingresos</p>
            <p className="font-semibold text-green-600 dark:text-green-400">
              +{totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total gastos</p>
            <p className="font-semibold text-red-600 dark:text-red-400">
              -{totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Balance neto</p>
            <p className={`font-semibold ${netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
