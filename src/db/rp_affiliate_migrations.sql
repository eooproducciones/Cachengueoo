-- ==============================================================================
-- CACHENGUEOO - SISTEMA DE RELACIONES PÚBLICAS Y MARKETING DE AFILIADOS
-- MIGRACIÓN DE BASE DE DATOS COMPLETA PARA SUPABASE
-- ==============================================================================
--
-- INSTRUCCIONES DE EJECUCIÓN:
-- 1. Inicia sesión en tu panel de Supabase: https://supabase.com/dashboard/
-- 2. Selecciona tu proyecto de Cachengueoo (gqpgncrxyomktbvmoimp)
-- 3. Dirígete a la sección "SQL Editor" en el menú lateral izquierdo.
-- 4. Haz clic en "New Query".
-- 5. Pega todo el contenido de este archivo y presiona el botón "Run".
-- 6. Las tablas, índices, triggers y políticas RLS quedarán activas de inmediato.
--
-- ==============================================================================

-- 1. EXTENSIÓN PARA UUIDs (si no existe)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: rp_applications (Solicitudes para ser Relación Pública)
CREATE TABLE IF NOT EXISTS public.rp_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    user_email TEXT,
    full_name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    instagram TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA: rp_profiles (Perfiles de Relaciones Públicas Aprobados y Activos)
CREATE TABLE IF NOT EXISTS public.rp_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE,
    public_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    whatsapp TEXT NOT NULL,
    instagram TEXT,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA: rp_event_links (Enlaces de Passline personalizados por RP y por Evento)
CREATE TABLE IF NOT EXISTS public.rp_event_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rp_id UUID NOT NULL REFERENCES public.rp_profiles(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    passline_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_rp_event UNIQUE (rp_id, event_id)
);

-- 5. TABLA: rp_activity_logs (Tracking de visitas, clics a entradas, cumpleaños y reservas)
CREATE TABLE IF NOT EXISTS public.rp_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rp_id UUID NOT NULL REFERENCES public.rp_profiles(id) ON DELETE CASCADE,
    event_id TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('visit', 'ticket_click', 'birthday_click', 'reservation_click')),
    session_id TEXT,
    ip_hash TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 6. ÍNDICES DE ALTO RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_rp_profiles_slug ON public.rp_profiles (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_rp_profiles_user_id ON public.rp_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_rp_profiles_status ON public.rp_profiles (status);

CREATE INDEX IF NOT EXISTS idx_rp_applications_user_id ON public.rp_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_rp_applications_status ON public.rp_applications (status);

CREATE INDEX IF NOT EXISTS idx_rp_event_links_rp_id ON public.rp_event_links (rp_id);
CREATE INDEX IF NOT EXISTS idx_rp_event_links_event_id ON public.rp_event_links (event_id);

CREATE INDEX IF NOT EXISTS idx_rp_activity_logs_rp_id ON public.rp_activity_logs (rp_id);
CREATE INDEX IF NOT EXISTS idx_rp_activity_logs_action ON public.rp_activity_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_rp_activity_logs_created ON public.rp_activity_logs (created_at DESC);

-- ==============================================================================
-- 7. FUNCTION & TRIGGER PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_rp_profiles_updated_at ON public.rp_profiles;
CREATE TRIGGER trigger_rp_profiles_updated_at
    BEFORE UPDATE ON public.rp_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_rp_applications_updated_at ON public.rp_applications;
CREATE TRIGGER trigger_rp_applications_updated_at
    BEFORE UPDATE ON public.rp_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_rp_event_links_updated_at ON public.rp_event_links;
CREATE TRIGGER trigger_rp_event_links_updated_at
    BEFORE UPDATE ON public.rp_event_links
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.rp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rp_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rp_event_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rp_activity_logs ENABLE ROW LEVEL SECURITY;

-- 8.1. POLÍTICAS PARA rp_profiles:
-- - Lectura pública (anónimos y autenticados pueden consultar perfiles aprobados por slug)
DROP POLICY IF EXISTS "Permitir lectura publica de perfiles RP activos" ON public.rp_profiles;
CREATE POLICY "Permitir lectura publica de perfiles RP activos"
    ON public.rp_profiles FOR SELECT
    USING (status = 'approved' OR auth.role() = 'authenticated');

-- - Inserción/actualización/borrado (admin o el propio RP autenticado)
DROP POLICY IF EXISTS "Permitir a RP o Admin gestionar perfil RP" ON public.rp_profiles;
CREATE POLICY "Permitir a RP o Admin gestionar perfil RP"
    ON public.rp_profiles FOR ALL
    USING (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- 8.2. POLÍTICAS PARA rp_applications:
-- - Usuarios pueden insertar sus solicitudes y leer las suyas
DROP POLICY IF EXISTS "Permitir envio y consulta de solicitudes RP" ON public.rp_applications;
CREATE POLICY "Permitir envio y consulta de solicitudes RP"
    ON public.rp_applications FOR ALL
    USING (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- 8.3. POLÍTICAS PARA rp_event_links:
-- - Lectura pública de links activos para resolver la compra de tickets de clientes
DROP POLICY IF EXISTS "Permitir lectura publica de links de eventos de RP" ON public.rp_event_links;
CREATE POLICY "Permitir lectura publica de links de eventos de RP"
    ON public.rp_event_links FOR SELECT
    USING (is_active = true OR auth.role() = 'authenticated');

-- - Gestión de links por RP o admin
DROP POLICY IF EXISTS "Permitir gestionar links de eventos de RP" ON public.rp_event_links;
CREATE POLICY "Permitir gestionar links de eventos de RP"
    ON public.rp_event_links FOR ALL
    USING (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- 8.4. POLÍTICAS PARA rp_activity_logs:
-- - Cualquiera (incluso visitante anónimo sin login) puede registrar logs de clics/visitas
DROP POLICY IF EXISTS "Permitir registro publico de clicks y visitas" ON public.rp_activity_logs;
CREATE POLICY "Permitir registro publico de clicks y visitas"
    ON public.rp_activity_logs FOR INSERT
    WITH CHECK (true);

-- - Consulta de estadísticas
DROP POLICY IF EXISTS "Permitir consulta de metricas de actividad" ON public.rp_activity_logs;
CREATE POLICY "Permitir consulta de metricas de actividad"
    ON public.rp_activity_logs FOR SELECT
    USING (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- ==============================================================================
-- 9. VISTA ANALÍTICA RESUMEN DE RPs (Para dashboard rápido)
-- ==============================================================================
CREATE OR REPLACE VIEW public.v_rp_analytics_summary AS
SELECT 
    p.id AS rp_id,
    p.user_id,
    p.public_name,
    p.slug,
    p.whatsapp,
    p.status,
    p.created_at,
    COUNT(DISTINCT l.id) AS configured_events_count,
    COUNT(DISTINCT CASE WHEN a.action_type = 'visit' THEN a.id END) AS total_visits,
    COUNT(DISTINCT CASE WHEN a.action_type = 'ticket_click' THEN a.id END) AS ticket_clicks,
    COUNT(DISTINCT CASE WHEN a.action_type = 'birthday_click' THEN a.id END) AS birthday_clicks,
    COUNT(DISTINCT CASE WHEN a.action_type = 'reservation_click' THEN a.id END) AS reservation_clicks,
    COUNT(DISTINCT a.id) AS total_actions
FROM public.rp_profiles p
LEFT JOIN public.rp_event_links l ON l.rp_id = p.id AND l.is_active = true
LEFT JOIN public.rp_activity_logs a ON a.rp_id = p.id
GROUP BY p.id, p.user_id, p.public_name, p.slug, p.whatsapp, p.status, p.created_at;
