-- ==============================================================================
-- CACHENGUEOO - SUPABASE PRODUCTION DATABASE SCHEMA
-- Mendoza, Argentina
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  birth_date DATE NOT NULL,
  age INTEGER NOT NULL,
  avatar_url TEXT,
  gender TEXT CHECK (gender IN ('hombre', 'mujer', 'no-binario', 'otro')),
  preference TEXT CHECK (preference IN ('hombres', 'mujeres', 'todos')),
  interests TEXT[] DEFAULT '{}',
  bio TEXT DEFAULT '',
  drink_favorite TEXT DEFAULT 'Fernet con Coca',
  instagram TEXT,
  is_verified_in_venue BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EVENTS (Cada noche en Cachengueoo es un evento)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  date_str TEXT NOT NULL,
  date_iso DATE NOT NULL,
  time_range TEXT NOT NULL DEFAULT '00:00 — 06:00',
  location_name TEXT DEFAULT 'Cachengueoo - Mendoza',
  description TEXT,
  flyer_url TEXT,
  is_active_tonight BOOLEAN DEFAULT FALSE,
  validation_mode TEXT DEFAULT 'GPS_OR_QR' CHECK (validation_mode IN ('GPS_OR_QR', 'GPS_ONLY', 'QR_ONLY', 'GPS_AND_QR')),
  djs TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TICKET TYPES
CREATE TABLE IF NOT EXISTS public.ticket_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  available_count INTEGER DEFAULT 100,
  includes_drink BOOLEAN DEFAULT FALSE,
  vip_access BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TICKETS (Entradas compradas por usuarios)
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id UUID REFERENCES public.ticket_types(id),
  ticket_type_name TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  holder_email TEXT NOT NULL,
  price NUMERIC NOT NULL,
  qr_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

-- 5. EVENT PRESENCE (Validación de presencia en la noche)
CREATE TABLE IF NOT EXISTS public.event_presence (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  method TEXT CHECK (method IN ('GPS', 'QR', 'MANUAL_ADMIN')),
  gps_accuracy_meters NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  is_valid BOOLEAN DEFAULT TRUE,
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- 6. QR SESSIONS (QRs dinámicos de puerta para el evento actual)
CREATE TABLE IF NOT EXISTS public.qr_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  secret_token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- 7. LIKES (Acciones de swipe en Cachengueoo Match asociadas a la noche)
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id, event_id)
);

-- 8. MATCHES (Generados cuando dos usuarios se dan like en el mismo evento)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_a_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id, event_id)
);

-- 9. MESSAGES (Supabase Realtime Chat entre matches)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BENEFITS
CREATE TABLE IF NOT EXISTS public.benefits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  condition TEXT NOT NULL,
  expiry_time TEXT,
  tag TEXT DEFAULT 'BARRA',
  only_members BOOLEAN DEFAULT FALSE,
  icon_name TEXT DEFAULT 'Sparkles',
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. MEMBERSHIP PLANS
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_fee NUMERIC NOT NULL,
  description TEXT,
  perks TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#F39200',
  is_popular BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. USER MEMBERSHIPS
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.membership_plans(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'expired')),
  start_date TIMESTAMPTZ DEFAULT NOW(),
  renews_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. BIRTHDAY REQUESTS
CREATE TABLE IF NOT EXISTS public.birthday_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date DATE NOT NULL,
  guest_count INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'contacted')),
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ADMIN USERS
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role TEXT DEFAULT 'staff' CHECK (role IN ('superadmin', 'admin', 'staff', 'door_security')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Cada usuario puede ver perfiles públicos y actualizar sólo el suyo
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Tickets: Los usuarios solo ven sus propios tickets
CREATE POLICY "Users can view own tickets"
  ON public.tickets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets"
  ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Presence: Solo ver si está validado para la noche
CREATE POLICY "Users can view presence"
  ON public.event_presence FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can register own presence"
  ON public.event_presence FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Matches: Solo los participantes pueden ver su match
CREATE POLICY "Users can view their matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Messages: Solo los participantes pueden leer y enviar mensajes
CREATE POLICY "Users can read conversation messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
