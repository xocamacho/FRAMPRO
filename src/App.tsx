import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import { Login } from '@/components/Login'
import { AppLayout } from '@/components/AppLayout'
import { InstallPWA } from '@/components/InstallPWA'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function AuthGate() {
  const { sesionIniciada, cerrarSesion } = useAuthStore()
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!session) cerrarSesion()
      })
      .catch(() => {
        // Supabase no configurado (placeholder) — mostrar login igual
        cerrarSesion()
      })
      .finally(() => {
        setCargando(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) cerrarSesion()
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500">Iniciando FincaPro...</p>
        </div>
      </div>
    )
  }

  return sesionIniciada ? <AppLayout /> : <Login />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
      <InstallPWA />
    </QueryClientProvider>
  )
}
