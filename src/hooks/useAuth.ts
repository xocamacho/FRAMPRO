import { useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const { usuario, finca, sesionIniciada, setUsuario, setFinca, cerrarSesion } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        cerrarSesion()
        return
      }
      cargarPerfil(session.user.id)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        cerrarSesion()
        return
      }
      cargarPerfil(session.user.id, event === 'SIGNED_IN')
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function cargarPerfil(userId: string, registrarIngreso = false) {
    console.log('📂 Cargando perfil del usuario:', userId)

    // 1️⃣ Cargar datos del usuario
    const { data: perfil, error: errUsuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()

    if (errUsuario) {
      console.error('❌ Error cargando usuario:', errUsuario)
      return
    }

    if (!perfil) {
      console.warn('⚠️ Perfil no encontrado')
      return
    }

    console.log('✅ Usuario cargado:', perfil)
    setUsuario(perfil)

    // 📅 Registrar ingreso solo en login real (no en refresh de página)
    if (registrarIngreso) {
      try {
        await supabase.from('login_logs').insert({
          usuario_id: perfil.id,
          finca_id: perfil.finca_id ?? null,
          tipo: 'entrada',
        })
        console.log('📝 Ingreso registrado')
      } catch { /* tabla puede no existir aún — no bloquear login */ }
    }

    // 2️⃣ Si el usuario tiene finca_id, cargar la finca
    if (perfil.finca_id) {
      console.log('🏠 Cargando finca con ID:', perfil.finca_id)
      const { data: fincaData, error: errFinca } = await supabase
        .from('fincas')
        .select('*')
        .eq('id', perfil.finca_id)
        .single()

      if (errFinca) {
        console.error('❌ Error cargando finca:', errFinca)
      } else if (fincaData) {
        console.log('✅ Finca cargada:', fincaData)
        setFinca(fincaData)
      }
    } else {
      console.log('ℹ️ Usuario sin finca asignada')
      setFinca(null)
    }
  }

  async function iniciarSesion(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function registrar(email: string, password: string, _nombre: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async function salir() {
    await supabase.auth.signOut()
    cerrarSesion()
  }

  return { usuario, finca, sesionIniciada, iniciarSesion, registrar, salir }
}
