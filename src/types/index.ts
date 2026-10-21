export type UserGender = 'hombre' | 'mujer' | 'no-binario' | 'otro';
export type PreferenceGender = 'hombres' | 'mujeres' | 'todos';

export interface NightNote {
  text: string;
  createdAt: string; // ISO timestamp
  hearts?: number;
}

export interface NightStory {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp (1 hora después)
  isLiveInstant: boolean;
  hearts?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  nickname: string;
  birthDate: string; // YYYY-MM-DD
  age: number;
  avatarUrl: string;
  photos?: string[]; // Hasta 3 fotos en perfil
  gender: UserGender;
  preference: PreferenceGender;
  interests: string[];
  bio: string;
  drinkFavorite: string;
  drinks?: string[]; // Hasta 2 tragos favoritos
  zodiacSign?: string;
  musicPreferences?: string[];
  instagram?: string;
  phone?: string;
  authProvider?: 'gmail' | 'instagram' | 'phone' | 'email';
  password?: string;
  isAdmin?: boolean;
  role?: 'admin' | 'user';
  createdAt: string;
  membershipPlanId?: string;
  nightNote?: NightNote;
  nightStory?: NightStory;
}

export type ValidationMode = 'GPS_OR_QR' | 'GPS_ONLY' | 'QR_ONLY' | 'GPS_AND_QR';

export interface VenueLocation {
  id: string;
  name: string;
  address?: string;
  city: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

export interface VenueConfig {
  name: string;
  city: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locations?: VenueLocation[];
}

export interface ClubEvent {
  id: string;
  title: string;
  subtitle?: string;
  dateStr: string; // e.g. "Viernes 9 de Octubre"
  dateIso: string;
  timeRange: string; // "00:00 — 06:00"
  locationName: string;
  description: string;
  flyerUrl: string;
  isActiveTonight: boolean;
  isFeatured?: boolean; // Destacado en Inicio (soporta múltiples eventos)
  validationMode: ValidationMode;
  djs: string[];
  ticketTypes: TicketType[];
  passlineUrl?: string;
  expiresAtIso?: string; // 12 horas después de la finalización del evento
}

export interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number; // in ARS
  availableCount: number;
  includesDrink?: boolean;
  vipAccess?: boolean;
}

export interface UserTicket {
  id: string;
  eventId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  eventTitle: string;
  eventDate: string;
  qrCode: string;
  holderName: string;
  holderEmail: string;
  price: number;
  purchasedAt: string;
  status: 'valid' | 'used' | 'cancelled';
}

export type PresenceMethod = 'GPS' | 'QR' | 'MANUAL_ADMIN';

export interface PresenceRecord {
  id: string;
  userId: string;
  eventId: string;
  validatedAt: string;
  method: PresenceMethod;
  gpsAccuracyMeters?: number;
  latitude?: number;
  longitude?: number;
  isValid: boolean;
  qrSessionId?: string;
}

export interface MatchProfile {
  userId: string;
  fullName: string;
  nickname: string;
  age: number;
  avatarUrl: string;
  photos?: string[]; // Hasta 3 fotos en perfil
  bio: string;
  interests: string[];
  drinkFavorite: string;
  drinks?: string[]; // Hasta 2 tragos favoritos
  zodiacSign?: string;
  musicPreferences?: string[];
  verifiedInVenue: boolean;
  lastPresenceCheck: string;
  instagram?: string;
  gender?: UserGender;
  nightNote?: NightNote;
  nightStory?: NightStory;
}

export interface LikeAction {
  id: string;
  fromUserId: string;
  toUserId: string;
  eventId: string;
  createdAt: string;
}

export interface MatchPair {
  id: string;
  userAId: string;
  userBId: string;
  eventId: string;
  eventTitle: string;
  matchedAt: string;
  lastMessageSnippet?: string;
  lastMessageAt?: string;
  partnerProfile?: MatchProfile;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface ClubBenefit {
  id: string;
  title: string;
  partnerName?: string;
  highlightBadge: string; // e.g. "10% OFF"
  description: string;
  promoCode?: string; // e.g. "CACHESPORT"
  actionUrl: string; // Link de redirección hacia WhatsApp o web
  actionType?: 'whatsapp' | 'web';
  actionLabel?: string; // e.g. "Pedir por WhatsApp" o "Ir a la Web"
  imageUrl?: string;
  category?: string;
  condition?: string;
  expiryTime?: string;
  tag?: string;
  onlyMembers?: boolean;
  iconName?: string;
  active: boolean;
}

export interface MembershipPlan {
  id: string;
  name: string;
  monthlyFee: number; // in ARS
  description: string;
  perks: string[];
  color: string;
  isPopular?: boolean;
}

export interface UserMembership {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'active' | 'pending' | 'expired';
  startDate: string;
  renewsAt: string;
}

export interface BirthdayRequest {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  instagram?: string;
  date: string;
  guestCount: number;
  status: 'pending' | 'approved' | 'contacted';
  notes?: string;
  submittedAt: string;
}

export interface QrNightSession {
  id: string;
  eventId: string;
  secretToken: string;
  generatedAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface PresenceState {
  isChecking: boolean;
  isInside: boolean;
  methodUsed?: PresenceMethod;
  distanceMeters?: number;
  gpsAccuracy?: number;
  statusMessage: string;
  lastChecked?: string;
  requiresQrFallback: boolean;
}
