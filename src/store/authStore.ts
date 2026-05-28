import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario, Finca } from '@/types'

interface AuthState {
  usuario: Usuario | null
  finca: Finca | null
  sesionIniciada: boolean
  setUsuario: (usuario: Usuario | null) => void
  setFinca: (finca: Finca | null) => void
  cerrarSesion: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      finca: null,
      sesionIniciada: false,
      setUsuario: (usuario) => set({ usuario, sesionIniciada: !!usuario }),
      setFinca: (finca) => set({ finca }),
      cerrarSesion: () => set({ usuario: null, finca: null, sesionIniciada: false }),
    }),
    { name: 'fincapro-auth' }
  )
)
