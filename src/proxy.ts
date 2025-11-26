import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ==========================================
// PROXY.TS - PROTECCIÓN DE RUTAS (Next.js 16)
// ==========================================
// En Next.js 16, proxy.ts reemplaza a middleware.ts
// para la lógica de autenticación y protección de rutas.

// Rutas públicas que no requieren autenticación
const publicRoutes = ['/login', '/auth/callback']

// Rutas que siempre deben ser accesibles (assets, API, etc.)
const ignoredRoutes = ['/_next', '/api', '/favicon.ico', '/manifest.json', '/icons']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignorar rutas de assets y API
  if (ignoredRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Crear respuesta base
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Crear cliente Supabase con manejo de cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Obtener usuario actual (esto también refresca la sesión)
  const { data: { user } } = await supabase.auth.getUser()

  // Si es ruta pública y el usuario está autenticado, redirigir al dashboard
  if (publicRoutes.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Si no es ruta pública y el usuario NO está autenticado, redirigir al login
  if (!publicRoutes.includes(pathname) && !user) {
    const redirectUrl = new URL('/login', request.url)
    // Guardar la URL original para redirigir después del login
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto archivos estáticos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
