import { create } from 'zustand'

interface UIState {
  sidebarAbierto: boolean
  moduloActivo: string
  toggleSidebar: () => void
  setSidebarAbierto: (v: boolean) => void
  setModuloActivo: (modulo: string) => void
}

const esDesktop = () =>
  typeof window !== 'undefined' && window.innerWidth >= 1024

export const useUIStore = create<UIState>((set) => ({
  // En desktop arranca abierto, en móvil cerrado
  sidebarAbierto: esDesktop(),
  moduloActivo: 'dashboard',

  toggleSidebar: () =>
    set((s) => ({ sidebarAbierto: !s.sidebarAbierto })),

  setSidebarAbierto: (v) =>
    set({ sidebarAbierto: v }),

  setModuloActivo: (modulo) =>
    set(() => ({
      moduloActivo: modulo,
      // Cierra el sidebar en móvil al navegar
      sidebarAbierto: esDesktop(),
    })),
}))
