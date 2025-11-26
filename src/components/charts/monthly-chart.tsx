'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CURRENCY_SYMBOL } from '@/lib/constants'
import { BarChart3 } from 'lucide-react'

// ==========================================
// GRÁFICO DE EVOLUCIÓN MENSUAL (BARRAS)
// ==========================================

interface MonthlyData {
  month: string
  monthLabel: string
  total: number
  budget?: number
}

interface MonthlyChartProps {
  data: MonthlyData[]
  budget?: number
}

export function MonthlyChart({ data, budget }: MonthlyChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Evolución mensual
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
    payload?: Array<{ value: number; payload: MonthlyData }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const isOverBudget = budget && data.total > budget

      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.monthLabel}</p>
          <p className={`text-sm ${isOverBudget ? 'text-destructive' : ''}`}>
            {data.total.toFixed(2)}{CURRENCY_SYMBOL}
          </p>
          {budget && (
            <p className="text-xs text-muted-foreground mt-1">
              {isOverBudget
                ? `${(data.total - budget).toFixed(2)}${CURRENCY_SYMBOL} sobre presupuesto`
                : `${(budget - data.total).toFixed(2)}${CURRENCY_SYMBOL} disponible`
              }
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // Calcular máximo para el eje Y
  const maxValue = Math.max(...data.map(d => d.total), budget || 0)
  const yAxisMax = Math.ceil(maxValue / 500) * 500 + 500

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Evolución mensual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}€`}
                domain={[0, yAxisMax]}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Línea de presupuesto */}
              {budget && (
                <ReferenceLine
                  y={budget}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: `Presupuesto: ${budget}€`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: 'hsl(var(--destructive))',
                  }}
                />
              )}

              <Bar
                dataKey="total"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resumen */}
        <div className="flex justify-between text-sm mt-4 pt-4 border-t">
          <div>
            <p className="text-muted-foreground text-xs">Promedio mensual</p>
            <p className="font-semibold">
              {(data.reduce((sum, d) => sum + d.total, 0) / data.length).toFixed(2)}{CURRENCY_SYMBOL}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Total período</p>
            <p className="font-semibold">
              {data.reduce((sum, d) => sum + d.total, 0).toFixed(2)}{CURRENCY_SYMBOL}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
