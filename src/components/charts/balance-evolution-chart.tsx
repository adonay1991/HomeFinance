'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CURRENCY_SYMBOL } from '@/lib/constants'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ==========================================
// GRÁFICO DE EVOLUCIÓN DEL SALDO BANCARIO
// Muestra la evolución del saldo a lo largo del tiempo
// ==========================================

interface BalanceDataPoint {
  date: string
  balance: number
  currency: string
}

interface BalanceEvolutionChartProps {
  data: BalanceDataPoint[]
  title?: string
}

export function BalanceEvolutionChart({
  data,
  title = 'Evolución del saldo'
}: BalanceEvolutionChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          <p className="text-sm">Sin datos de saldo histórico</p>
        </CardContent>
      </Card>
    )
  }

  // Formatear datos para el gráfico
  const formattedData = data.map(point => ({
    ...point,
    dateFormatted: formatDate(point.date),
    balanceFormatted: point.balance,
  }))

  // Calcular estadísticas
  const firstBalance = data[0]?.balance ?? 0
  const lastBalance = data[data.length - 1]?.balance ?? 0
  const change = lastBalance - firstBalance
  const changePercent = firstBalance !== 0
    ? ((change / Math.abs(firstBalance)) * 100)
    : 0
  const minBalance = Math.min(...data.map(d => d.balance))
  const maxBalance = Math.max(...data.map(d => d.balance))

  // Determinar el color según si subió o bajó
  const trendColor = change > 0
    ? 'text-green-600 dark:text-green-400'
    : change < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground'

  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus

  // Color del área según tendencia
  const areaColor = change >= 0 ? '#22c55e' : '#ef4444'
  const areaColorLight = change >= 0 ? '#22c55e20' : '#ef444420'

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
    label
  }: {
    active?: boolean
    payload?: Array<{ value: number; dataKey: string }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      const balance = payload[0]?.value ?? 0

      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-1 text-sm">{label}</p>
          <p className="text-lg font-bold">
            {balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
          </p>
        </div>
      )
    }
    return null
  }

  // Calcular dominio del eje Y con margen
  const yMin = Math.floor(minBalance * 0.95)
  const yMax = Math.ceil(maxBalance * 1.05)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
            {title}
          </CardTitle>
          <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
            {change > 0 ? '+' : ''}{change.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
            <span className="text-xs text-muted-foreground">
              ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={areaColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={areaColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`}
                domain={[yMin, yMax]}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="balanceFormatted"
                stroke={areaColor}
                strokeWidth={2}
                fill="url(#balanceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Resumen del período */}
        <div className="grid grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t">
          <div>
            <p className="text-muted-foreground text-xs">Mínimo</p>
            <p className="font-semibold">
              {minBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Máximo</p>
            <p className="font-semibold">
              {maxBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Actual</p>
            <p className="font-semibold">
              {lastBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ==========================================
// UTILIDADES
// ==========================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDate()
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const month = monthNames[date.getMonth()]
  return `${day} ${month}`
}
