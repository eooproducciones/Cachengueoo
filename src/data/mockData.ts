import {
  ClubBenefit,
  ClubEvent,
  MatchPair,
  MatchProfile,
  MembershipPlan,
  NightStory,
  UserProfile,
  UserTicket,
} from '../types';

export const MOCK_NIGHT_STORIES: NightStory[] = [];

export const CURRENT_MOCK_USER: UserProfile = {
  id: 'usr_me_01',
  email: '',
  fullName: '',
  nickname: '',
  birthDate: '2001-01-01',
  age: 23,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  photos: [],
  gender: 'otro',
  preference: 'todos',
  interests: ['Cachengue', 'Fiesta'],
  bio: '',
  drinkFavorite: 'Fernet',
  musicPreferences: ['Reggaeton', 'Cumbia'],
  createdAt: new Date().toISOString(),
};

export const MOCK_EVENTS: ClubEvent[] = [];

export const MOCK_MATCH_PROFILES: MatchProfile[] = [];

export const MOCK_USER_TICKETS: UserTicket[] = [];

export const MOCK_BENEFITS: ClubBenefit[] = [];

export const MOCK_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'plan_regular',
    name: 'CLUB CACHENGUERO',
    monthlyFee: 14000,
    description: 'Para los que no se pierden una noche de fiesta.',
    perks: [
      '2 Entradas Generales gratis al mes',
      'Fila preferencial hasta las 02:00',
      '1 Trago de bienvenida por noche',
      'Descuentos exclusivos en barra',
    ],
    color: '#e4e4e7',
    isPopular: false,
  },
  {
    id: 'plan_vip',
    name: 'CLUB VIP MENDOZA',
    monthlyFee: 26000,
    description: 'Nuestra membresía insignia con beneficios de élite.',
    perks: [
      'Entradas Generales ilimitadas los viernes y sábados',
      '1 Acceso VIP por mes con terraza exclusiva',
      'Fast-pass en puerta sin colas toda la noche',
      '2x1 en barra VIP hasta las 03:00 hs',
      'Prioridad en reserva de mesas y livings',
    ],
    color: '#F39200',
    isPopular: true,
  },
  {
    id: 'plan_black',
    name: 'BLACK LEGEND',
    monthlyFee: 49000,
    description: 'Experiencia nocturna sin límites en Cachengueoo.',
    perks: [
      'Acceso VIP Total e irrestricto + 1 acompañante',
      'Living VIP reservado en fechas especiales',
      'Botella de bienvenida mensual a elección',
      'Atención personalizada de RR.PP. vía WhatsApp',
      'Cachengueoo Match Golden Highlight en la app',
    ],
    color: '#fbbf24',
    isPopular: false,
  },
];

export const INITIAL_MATCHES: MatchPair[] = [];
