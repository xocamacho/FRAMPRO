-- Nuevos campos en usuarios
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS cedula    text,
  ADD COLUMN IF NOT EXISTS telefono  text,
  ADD COLUMN IF NOT EXISTS foto_url  text,
  ADD COLUMN IF NOT EXISTS perfil_completo boolean NOT NULL DEFAULT false;

-- Los admins ya tienen el perfil completo
UPDATE public.usuarios SET perfil_completo = true WHERE rol = 'admin';

-- Bucket de avatares (ejecutar en Storage si no existe)
-- insert into storage.buckets (id, name, public) values ('avatares', 'avatares', true)
-- on conflict do nothing;

-- Política para que cada usuario pueda subir su propio avatar
-- (requiere bucket "avatares" creado como público)
CREATE POLICY IF NOT EXISTS "avatares_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatares' AND auth.uid()::text = split_part(name, '/', 1));

CREATE POLICY IF NOT EXISTS "avatares_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatares' AND auth.uid()::text = split_part(name, '/', 1));

CREATE POLICY IF NOT EXISTS "avatares_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatares');
