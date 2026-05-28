-- ============================================================
-- FINCAPRO — Schema completo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- CATEGORIAS DE ANIMALES
CREATE TABLE IF NOT EXISTS categorias_animales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finca_id UUID NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  color_hex VARCHAR(7),
  icono VARCHAR(50),
  ciclo_reproduccion_meses INT,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- FINCAS
CREATE TABLE IF NOT EXISTS fincas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  ubicacion VARCHAR(255),
  numero_ica VARCHAR(50) UNIQUE,
  hectareas DECIMAL(10, 2),
  coordenadas_lat DECIMAL(9, 6),
  coordenadas_lng DECIMAL(9, 6),
  logo_url VARCHAR(500),
  clima VARCHAR(50),
  propietario_id UUID REFERENCES auth.users,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  rol VARCHAR(50) NOT NULL DEFAULT 'admin',
  finca_id UUID REFERENCES fincas(id),
  permisos JSONB DEFAULT '{"modulos": ["animales","salud","reproduccion","pesajes","tareas","inventario","alertas","metas","ia"]}'::jsonb,
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- POTREROS
CREATE TABLE IF NOT EXISTS potreros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finca_id UUID NOT NULL REFERENCES fincas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  hectareas DECIMAL(10, 2),
  color_hex VARCHAR(7) DEFAULT '#16a34a',
  estado VARCHAR(50) DEFAULT 'en_uso',
  coordenadas_poligono JSONB,
  dias_desde_rotacion INT DEFAULT 0,
  pastos_sembrados JSONB DEFAULT '[]'::jsonb,
  capacidad_carga DECIMAL(10, 2),
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- ANIMALES
CREATE TABLE IF NOT EXISTS animales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finca_id UUID NOT NULL REFERENCES fincas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  numero_arete VARCHAR(50),
  chip_ica VARCHAR(50),
  especie VARCHAR(50) DEFAULT 'bovino',
  categoria_id UUID REFERENCES categorias_animales(id),
  raza VARCHAR(100),
  sexo VARCHAR(20) NOT NULL,
  color_marcas TEXT,
  fecha_nacimiento DATE,
  peso_actual DECIMAL(10, 2),
  potrero_id UUID REFERENCES potreros(id),
  estado VARCHAR(50) DEFAULT 'sano',
  genealogia_madre_id UUID REFERENCES animales(id),
  genealogia_padre_id UUID REFERENCES animales(id),
  precio_compra DECIMAL(12, 2),
  fecha_entrada DATE,
  es_compania BOOLEAN DEFAULT false,
  propietario_compania VARCHAR(255),
  foto_url VARCHAR(500),
  datos_reproductivos JSONB DEFAULT '{}'::jsonb,
  bcs_actual INT,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- VACUNAS
CREATE TABLE IF NOT EXISTS vacunas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  fecha_aplicacion DATE NOT NULL,
  proxima_dosis DATE,
  lote VARCHAR(100),
  veterinario VARCHAR(255),
  notas TEXT,
  temperatura_clima VARCHAR(50),
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- PESAJES
CREATE TABLE IF NOT EXISTS pesajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  peso_kg DECIMAL(10, 2) NOT NULL,
  fecha DATE NOT NULL,
  bcs INT,
  temperatura_ambiente INT,
  registrado_por UUID REFERENCES auth.users,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- PARTOS
CREATE TABLE IF NOT EXISTS partos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  madre_id UUID NOT NULL REFERENCES animales(id),
  fecha_parto DATE NOT NULL,
  tipo_parto VARCHAR(50) DEFAULT 'natural',
  sexo_cria VARCHAR(20),
  peso_cria DECIMAL(10, 2),
  cria_id UUID REFERENCES animales(id),
  complicaciones TEXT,
  veterinario VARCHAR(255),
  temperatura_clima VARCHAR(50),
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- INSEMINACIONES
CREATE TABLE IF NOT EXISTS inseminaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaca_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  fecha_inseminacion DATE NOT NULL,
  tipo VARCHAR(50) DEFAULT 'ia_natural',
  semen_toro_raza VARCHAR(100),
  resultado VARCHAR(50) DEFAULT 'pendiente',
  fecha_deteccion_prenez DATE,
  semanas_gestacion INT,
  temperatura_clima VARCHAR(50),
  registrado_por UUID REFERENCES auth.users,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- SANIDAD
CREATE TABLE IF NOT EXISTS sanidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo_evento VARCHAR(50) DEFAULT 'observacion',
  descripcion TEXT NOT NULL,
  diagnostico TEXT,
  tratamiento VARCHAR(500),
  medicamentos JSONB DEFAULT '[]'::jsonb,
  resultado VARCHAR(50),
  veterinario VARCHAR(255),
  temperatura_ambiente INT,
  humedad INT,
  foto_url VARCHAR(500),
  registrado_por UUID REFERENCES auth.users,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- DESPARASITACIONES
CREATE TABLE IF NOT EXISTS desparasitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  producto VARCHAR(255) NOT NULL,
  principio_activo VARCHAR(100),
  dosis DECIMAL(10, 2),
  via_administracion VARCHAR(50),
  veterinario VARCHAR(255),
  proxima_desparasitacion DATE,
  temperatura_clima VARCHAR(50),
  registrado_por UUID REFERENCES auth.users,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- PRODUCCION DE LECHE
CREATE TABLE IF NOT EXISTS leche_produccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaca_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  litros DECIMAL(10, 2),
  proteina_pct DECIMAL(5, 2),
  grasa_pct DECIMAL(5, 2),
  solidos_totales_pct DECIMAL(5, 2),
  calidad VARCHAR(50),
  temperatura_ambiente INT,
  registrado_por UUID REFERENCES auth.users,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- INVENTARIO
CREATE TABLE IF NOT EXISTS inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finca_id UUID NOT NULL REFERENCES fincas(id) ON DELETE CASCADE,
  categoria VARCHAR(50) DEFAULT 'insumos',
  nombre VARCHAR(255) NOT NULL,
  cantidad INT DEFAULT 0,
  unidad VARCHAR(50) DEFAULT 'unidades',
  costo_unitario DECIMAL(12, 2),
  fecha_vencimiento DATE,
  proveedor VARCHAR(255),
  alerta_bajo BOOLEAN DEFAULT false,
  cantidad_minima INT DEFAULT 0,
  registrado_por UUID REFERENCES auth.users,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- TAREAS
CREATE TABLE IF NOT EXISTS tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finca_id UUID NOT NULL REFERENCES fincas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  asignado_a UUID REFERENCES auth.users,
  creado_por UUID NOT NULL REFERENCES auth.users,
  estado VARCHAR(50) DEFAULT 'pendiente',
  fecha_creacion DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  prioridad VARCHAR(20) DEFAULT 'media',
  foto_evidencia_url VARCHAR(500),
  notas_completacion TEXT,
  fecha_completacion DATE,
  fecha_registro TIMESTAMP DEFAULT NOW()
);

-- NOVEDADES
CREATE TABLE IF NOT EXISTS novedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finca_id UUID NOT NULL REFERENCES fincas(id) ON DELETE CASCADE,
  animal_id UUID REFERENCES animales(id),
  descripcion TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'observacion',
  foto_url VARCHAR(500),
  registrado_por UUID NOT NULL REFERENCES auth.users,
  temperatura_ambiente INT,
  humedad INT,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- FINANZAS INGRESOS
CREATE TABLE IF NOT EXISTS finanzas_ingresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finca_id UUID NOT NULL REFERENCES fincas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  concepto VARCHAR(255),
  cantidad DECIMAL(12, 2),
  valor_total DECIMAL(12, 2) NOT NULL,
  descripcion TEXT,
  comprobante VARCHAR(255),
  registrado_por UUID REFERENCES auth.users,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- FINANZAS EGRESOS
CREATE TABLE IF NOT EXISTS finanzas_egresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finca_id UUID NOT NULL REFERENCES fincas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  concepto VARCHAR(255),
  cantidad DECIMAL(12, 2),
  valor_total DECIMAL(12, 2) NOT NULL,
  descripcion TEXT,
  comprobante VARCHAR(255),
  registrado_por UUID REFERENCES auth.users,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- METAS
CREATE TABLE IF NOT EXISTS metas_finca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finca_id UUID NOT NULL REFERENCES fincas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50),
  valor_meta DECIMAL(12, 2),
  valor_actual DECIMAL(12, 2) DEFAULT 0,
  fecha_inicio DATE,
  fecha_fin DATE,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: actualizar fecha_actualizacion automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fincas_updated
  BEFORE UPDATE ON fincas
  FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trigger_animales_updated
  BEFORE UPDATE ON animales
  FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trigger_potreros_updated
  BEFORE UPDATE ON potreros
  FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- ============================================================
-- TRIGGER: crear perfil de usuario automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION manejar_nuevo_usuario()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'admin'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION manejar_nuevo_usuario();

-- ============================================================
-- RLS (Row Level Security) — los usuarios solo ven su finca
-- ============================================================
ALTER TABLE fincas ENABLE ROW LEVEL SECURITY;
ALTER TABLE animales ENABLE ROW LEVEL SECURITY;
ALTER TABLE potreros ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inseminaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE desparasitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE leche_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE novedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE finanzas_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE finanzas_egresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_finca ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_animales ENABLE ROW LEVEL SECURITY;

-- Políticas básicas: usuario ve solo los datos de su finca
CREATE POLICY "usuarios_ven_su_finca" ON fincas
  FOR ALL USING (propietario_id = auth.uid());

CREATE POLICY "usuarios_ven_sus_datos" ON usuarios
  FOR ALL USING (id = auth.uid());

CREATE POLICY "animales_por_finca" ON animales
  FOR ALL USING (
    finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
    OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "potreros_por_finca" ON potreros
  FOR ALL USING (
    finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
    OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "vacunas_por_animal" ON vacunas
  FOR ALL USING (
    animal_id IN (
      SELECT id FROM animales WHERE
        finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
        OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
    )
  );

CREATE POLICY "inventario_por_finca" ON inventario
  FOR ALL USING (
    finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
    OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "tareas_por_finca" ON tareas
  FOR ALL USING (
    finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
    OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "finanzas_ingresos_por_finca" ON finanzas_ingresos
  FOR ALL USING (
    finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
    OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "finanzas_egresos_por_finca" ON finanzas_egresos
  FOR ALL USING (
    finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
    OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "metas_por_finca" ON metas_finca
  FOR ALL USING (
    finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
    OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "novedades_por_finca" ON novedades
  FOR ALL USING (
    finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
    OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "categorias_por_finca" ON categorias_animales
  FOR ALL USING (
    finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
    OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
  );

-- Políticas para tablas que referencian animal_id
CREATE POLICY "pesajes_por_animal" ON pesajes
  FOR ALL USING (
    animal_id IN (
      SELECT id FROM animales WHERE
        finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
        OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
    )
  );

CREATE POLICY "sanidad_por_animal" ON sanidad
  FOR ALL USING (
    animal_id IN (
      SELECT id FROM animales WHERE
        finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
        OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
    )
  );

CREATE POLICY "partos_por_animal" ON partos
  FOR ALL USING (
    madre_id IN (
      SELECT id FROM animales WHERE
        finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
        OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
    )
  );

CREATE POLICY "inseminaciones_por_animal" ON inseminaciones
  FOR ALL USING (
    vaca_id IN (
      SELECT id FROM animales WHERE
        finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
        OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
    )
  );

CREATE POLICY "desparasitaciones_por_animal" ON desparasitaciones
  FOR ALL USING (
    animal_id IN (
      SELECT id FROM animales WHERE
        finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
        OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
    )
  );

CREATE POLICY "leche_por_animal" ON leche_produccion
  FOR ALL USING (
    vaca_id IN (
      SELECT id FROM animales WHERE
        finca_id IN (SELECT id FROM fincas WHERE propietario_id = auth.uid())
        OR finca_id IN (SELECT finca_id FROM usuarios WHERE id = auth.uid())
    )
  );
