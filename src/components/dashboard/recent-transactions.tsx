import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, ArrowDownLeft, Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getRecentBankTransactions } from '@/lib/actions/banking'

// ==========================================
// RECENT TRANSACTIONS - Últimos movimientos bancarios
// ==========================================

export async function RecentTransactions() {
  const transactions = await getRecentBankTransactions(8)

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" />
            Últimos movimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay movimientos todavía. Sincroniza tu cuenta para ver transacciones.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5" />
          Últimos movimientos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} transaction={tx} />
        ))}
      </CardContent>
    </Card>
  )
}

interface Transaction {
  id: string
  amount: number
  currency: string
  description: string
  date: string
  type: 'income' | 'expense'
  merchantCode: string | null
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === 'income'
  const category = isIncome ? null : getCategoryFromDescription(transaction.description)

  // Formatear fecha
  const date = new Date(transaction.date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let dateStr: string
  if (date.toDateString() === today.toDateString()) {
    dateStr = 'Hoy'
  } else if (date.toDateString() === yesterday.toDateString()) {
    dateStr = 'Ayer'
  } else {
    dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isIncome ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
          {isIncome ? (
            <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium line-clamp-1">
            {transaction.description}
          </p>
          <p className="text-xs text-muted-foreground">
            {dateStr}
            {category && (
              <Badge variant="outline" className="ml-2 text-xs py-0">
                {category}
              </Badge>
            )}
          </p>
        </div>
      </div>
      <p className={`text-sm font-semibold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
      </p>
    </div>
  )
}

/**
 * Obtiene la categoría basada en la descripción (simplificado)
 */
function getCategoryFromDescription(description: string): string | null {
  const desc = description.toLowerCase()

  // Mapeo simple de keywords a categorías
  const categoryMap: Record<string, string[]> = {
    'comida': ['mercadona', 'carrefour', 'lidl', 'aldi', 'dia', 'supermercado', 'restaurante', 'mcdonalds', 'burger', 'cafeteria'],
    'transporte': ['repsol', 'cepsa', 'gasolina', 'parking', 'uber', 'cabify', 'renfe', 'metro', 'taxi'],
    'facturas': ['movistar', 'vodafone', 'orange', 'iberdrola', 'endesa', 'netflix', 'spotify', 'seguro'],
    'hogar': ['ikea', 'leroy', 'bricodepot', 'mediamarkt', 'amazon'],
    'salud': ['farmacia', 'clinica', 'medico', 'dentista', 'optica', 'gimnasio'],
    'ocio': ['cine', 'teatro', 'concierto', 'hotel', 'booking', 'zara', 'h&m', 'primark'],
  }

  for (const [category, keywords] of Object.entries(categoryMap)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        return category
      }
    }
  }

  return null
}
