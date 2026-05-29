/**
 * CompletarPerfil — aparece la primera vez que un trabajador entra
 * para que ingrese su cédula, teléfono y foto opcional.
 */
import { useState, useRef } from 'react'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import { Leaf, User, Phone, CreditCard, Camera, CheckCircle2, X } from 'lucide-react'

export function CompletarPerfil() {
  const { usuario, setUsuario } = useAuthStore()

  const [cedula,    setCedula]    = useState('')
  const [telefono,  setTelefono]  = useState('')
  const [foto,      setFoto]      = useState<File | null>(null)
  const [preview,   setPreview]   = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('La foto no puede superar 5 MB'); return }
    setFoto(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!cedula.trim())    { setError('La cédula es obligatoria'); return }
    if (!telefono.trim())  { setError('El teléfono es obligatorio'); return }
    if (!usuario)          return

    setGuardando(true)
    setError('')

    try {
      let foto_url: string | null = usuario.foto_url ?? null

      // ── Subir foto si la eligió ──────────────────────────────────
      if (foto) {
        const ext  = foto.name.split('.').pop()
        const path = `${usuario.id}/avatar.${ext}`

        const { error: upErr } = await supabase.storage
          .from('avatares')
          .upload(path, foto, { upsert: true, contentType: foto.type })

        if (upErr) {
          // Si falla la foto, continuamos sin ella (no bloqueamos)
          console.warn('No se pudo subir la foto:', upErr.message)
        } else {
          const { data: urlData } = supabase.storage.from('avatares').getPublicUrl(path)
          foto_url = urlData.publicUrl
        }
      }

      // ── Actualizar registro en usuarios ──────────────────────────
      const { data, error: dbErr } = await supabase
        .from('usuarios')
        .update({
          cedula:           cedula.trim(),
          telefono:         telefono.trim(),
          foto_url,
          perfil_completo:  true,
        })
        .eq('id', usuario.id)
        .select()
        .single()

      if (dbErr) { setError(dbErr.message); return }

      // Actualiza el store para que App.tsx ya no muestre este componente
      setUsuario({ ...usuario, ...data })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Cabecera verde */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Leaf size={22} className="text-white" />
            </div>
            <div>
              <p className="text-green-200 text-xs font-medium uppercase tracking-wider">FincaXpro</p>
              <h1 className="text-xl font-bold">¡Bienvenido, {usuario?.nombre?.split(' ')[0]}!</h1>
            </div>
          </div>
          <p className="text-green-100 text-sm leading-relaxed">
            Antes de continuar, completa tu información personal. Solo tomará un momento.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={guardar} className="px-8 py-6 flex flex-col gap-5">

          {/* Foto de perfil */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative group"
            >
              <div className={`w-24 h-24 rounded-full border-4 overflow-hidden flex items-center justify-center transition-all
                ${preview ? 'border-green-400' : 'border-gray-200 bg-gray-50'}`}>
                {preview ? (
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <User size={36} className="text-gray-300" />
                )}
                {/* Overlay cámara */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={22} className="text-white" />
                </div>
              </div>
              {preview && (
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); setFoto(null); setPreview(null) }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow"
                >
                  <X size={12} />
                </button>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onFoto} />
            <p className="text-xs text-gray-400">
              {preview ? '✅ Foto seleccionada' : 'Foto de perfil (opcional)'}
            </p>
          </div>

          {/* Cédula */}
          <div>
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-1.5">
              <CreditCard size={15} className="text-green-600" /> Número de cédula *
            </label>
            <input
              type="text"
              value={cedula}
              onChange={e => setCedula(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 1234567890"
              maxLength={12}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-1.5">
              <Phone size={15} className="text-green-600" /> Teléfono / Celular *
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={e => setTelefono(e.target.value.replace(/[^\d+\s-]/g, ''))}
              placeholder="Ej: 300 123 4567"
              maxLength={15}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md disabled:opacity-60 text-base mt-1"
          >
            {guardando ? (
              <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg> Guardando...</>
            ) : (
              <><CheckCircle2 size={18} /> Completar y entrar</>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Esta información solo la ve el administrador de tu finca.
          </p>
        </form>
      </div>
    </div>
  )
}
