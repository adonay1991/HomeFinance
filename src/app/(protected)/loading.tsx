import { AuthLoading } from '@/components/auth'

// ==========================================
// LOADING PARA RUTAS PROTEGIDAS
// ==========================================
// Next.js muestra este componente automáticamente
// mientras carga las páginas del grupo (protected).
// Esto evita el flash de contenido no autenticado.

export default function ProtectedLoading() {
  return <AuthLoading />
}
