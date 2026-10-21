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

const now = Date.now();
const minutesAgo = (mins: number) => new Date(now - mins * 60 * 1000).toISOString();
const expiresFromMinutesAgo = (mins: number) =>
  new Date(now + (60 - mins) * 60 * 1000).toISOString();

export const MOCK_NIGHT_STORIES: NightStory[] = [
  {
    id: 'story_valen_01',
    userId: 'usr_match_01',
    userName: 'Valentina',
    userAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    mediaUrl:
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    mediaType: 'image',
    caption: '¡La barra VIP prendida fuego! 🍸✨',
    createdAt: minutesAgo(14),
    expiresAt: expiresFromMinutesAgo(14),
    isLiveInstant: true,
    hearts: 6,
  },
  {
    id: 'story_juli_01',
    userId: 'usr_match_02',
    userName: 'Julieta',
    userAvatar:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    mediaUrl:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
    mediaType: 'image',
    caption: 'Con las chicas en el medio de la pista 💃🔥',
    createdAt: minutesAgo(26),
    expiresAt: expiresFromMinutesAgo(26),
    isLiveInstant: true,
    hearts: 9,
  },
  {
    id: 'story_santi_01',
    userId: 'usr_match_03',
    userName: 'Santiago',
    userAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    mediaUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    mediaType: 'image',
    caption: 'El set del DJ Valen está criminal 🔊🎧',
    createdAt: minutesAgo(38),
    expiresAt: expiresFromMinutesAgo(38),
    isLiveInstant: true,
    hearts: 4,
  },
  {
    id: 'story_cami_01',
    userId: 'usr_match_04',
    userName: 'Camila',
    userAvatar:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    mediaUrl:
      'https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=800&q=80',
    mediaType: 'image',
    caption: '¡Salud Cachengueoo! 🥂💫',
    createdAt: minutesAgo(47),
    expiresAt: expiresFromMinutesAgo(47),
    isLiveInstant: true,
    hearts: 7,
  },
];

export const CURRENT_MOCK_USER: UserProfile = {
  id: 'usr_me_01',
  email: 'mateo.cachengueoo@gmail.com',
  fullName: 'Mateo Rossi',
  nickname: 'Teo',
  birthDate: '2001-08-14',
  age: 23,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  photos: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
  ],
  gender: 'hombre',
  preference: 'todos',
  interests: ['Fernet', 'Reggaeton', 'Cumbia', 'Gin', 'Trap'],
  bio: 'Viernes en Cachengueoo siempre. Si hay Fernet, hay charla 🍸',
  drinkFavorite: 'Fernet',
  zodiacSign: 'Leo',
  musicPreferences: ['Reggaeton', 'Cuarteto', 'Cumbia'],
  instagram: '@mateorossi_',
  createdAt: '2026-01-10T20:00:00Z',
  membershipPlanId: 'plan_vip',
  nightNote: {
    text: '¡Viernes en Cachengueoo! Con vaso en mano 🍸',
    createdAt: minutesAgo(12),
    hearts: 5,
  },
};

const getMockDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return {
    iso: `${year}-${month}-${day}`,
    str: `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`,
  };
};

const mockDateToday = getMockDate(0);
const mockDateTomorrow = getMockDate(1);
const mockDateNextWeek = getMockDate(6);

export const MOCK_EVENTS: ClubEvent[] = [
  {
    id: 'evt_tonight_01',
    title: 'CACHENGUEOO LIVE EDITION',
    dateStr: mockDateToday.str,
    dateIso: mockDateToday.iso,
    timeRange: '23:00 — 06:00 hs',
    locationName: 'Cachengueoo Boliche · Mendoza',
    description:
      'Llegó la noche más picante de Mendoza. Pista principal a puro cachengue, reggaeton de los 2000s y los mejores tragos de autor en la barra.',
    flyerUrl:
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    isActiveTonight: true,
    isFeatured: true,
    passlineUrl: 'https://www.passline.com',
    validationMode: 'GPS_OR_QR',
    djs: ['DJ Valen Romero', 'DJ Facu Gomez', 'Guest Cachengue Set'],
    ticketTypes: [
      {
        id: 'tkt_gen_01',
        name: 'Entrada General (Early Bird)',
        description: 'Ingreso antes de las 02:00 hs por fila general.',
        price: 7000,
        availableCount: 45,
        includesDrink: false,
      },
      {
        id: 'tkt_gen_drink_01',
        name: 'General + Trago en Barra',
        description: 'Incluye ingreso sin horario límite + 1 trago a elección.',
        price: 11000,
        availableCount: 30,
        includesDrink: true,
      },
      {
        id: 'tkt_vip_01',
        name: 'Acceso VIP Terraza & Pista Alta',
        description: 'Acceso prioritario fast-pass, barra exclusiva y terraza.',
        price: 18000,
        availableCount: 12,
        vipAccess: true,
        includesDrink: true,
      },
    ],
  },
  {
    id: 'evt_saturday_02',
    title: 'CACHENGUEOO XL · EDICIÓN ESPECIAL',
    dateStr: mockDateTomorrow.str,
    dateIso: mockDateTomorrow.iso,
    timeRange: '23:00 — 06:30 hs',
    locationName: 'Cachengueoo Boliche · Mendoza',
    description:
      'El fin de semana explota la casa. Pantallas LED gigantes, show de luces, pista al aire libre y 3 barras habilitadas.',
    flyerUrl:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    isActiveTonight: false,
    isFeatured: true,
    passlineUrl: 'https://www.passline.com',
    validationMode: 'GPS_OR_QR',
    djs: ['DJ Nico Soria', 'Cachengueoo All Stars'],
    ticketTypes: [
      {
        id: 'tkt_sat_gen',
        name: 'General Sábado',
        description: 'Ingreso hasta las 02:30.',
        price: 8500,
        availableCount: 80,
      },
      {
        id: 'tkt_sat_vip',
        name: 'VIP Sábado + Trago',
        description: 'Fila exclusiva y pulsera VIP.',
        price: 20000,
        availableCount: 25,
        vipAccess: true,
        includesDrink: true,
      },
    ],
  },
  {
    id: 'evt_special_03',
    title: 'NOCHE RETRO CACHENGUE 2000s',
    dateStr: mockDateNextWeek.str,
    dateIso: mockDateNextWeek.iso,
    timeRange: '23:00 — 06:00 hs',
    locationName: 'Cachengueoo Boliche · Mendoza',
    description:
      'Wisin & Yandel, Daddy Yankee, Don Omar, Miranda y cumbias noventeras hasta el amanecer.',
    flyerUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    isActiveTonight: false,
    isFeatured: true,
    passlineUrl: 'https://www.passline.com',
    validationMode: 'GPS_OR_QR',
    djs: ['DJ Retro King', 'Residente Cachengueoo'],
    ticketTypes: [
      {
        id: 'tkt_retro_gen',
        name: 'General Anticipada',
        description: 'Válido toda la noche.',
        price: 7500,
        availableCount: 150,
      },
    ],
  },
];

export const MOCK_MATCH_PROFILES: MatchProfile[] = [
  {
    userId: 'usr_match_01',
    fullName: 'Valentina Morales',
    nickname: 'Valen',
    age: 22,
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    ],
    bio: 'Si suena Daddy Yankee o Duki estoy en el medio de la pista. Barra VIP 🍸',
    interests: ['Gin', 'Reggaeton', 'Old School', 'Cachengue'],
    drinkFavorite: 'Gin',
    zodiacSign: 'Escorpio',
    musicPreferences: ['Reggaeton', 'Old School', 'Cumbia'],
    instagram: '@valenmorales',
    gender: 'mujer',
    verifiedInVenue: true,
    lastPresenceCheck: 'Hace 8 min vía GPS',
    nightNote: {
      text: 'En la barra VIP buscando Fernet 🍸',
      createdAt: minutesAgo(8),
      hearts: 14,
    },
  },
  {
    userId: 'usr_match_02',
    fullName: 'Julieta Benítez',
    nickname: 'Juli',
    age: 23,
    avatarUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    ],
    bio: 'Vine con mis amigas a festejar. En busca de alguien que invite el primer Fernet 😉',
    interests: ['Fernet', 'Cuarteto', 'Cumbia'],
    drinkFavorite: 'Fernet',
    zodiacSign: 'Tauro',
    musicPreferences: ['Cuarteto', 'Cumbia', 'Reggaeton'],
    instagram: '@julibenitez_',
    gender: 'mujer',
    verifiedInVenue: true,
    lastPresenceCheck: 'Hace 3 min vía QR',
    nightNote: {
      text: 'Perdí a mis amigas en la pista jajaja 😂',
      createdAt: minutesAgo(18),
      hearts: 8,
    },
  },
  {
    userId: 'usr_match_03',
    fullName: 'Santiago Silva',
    nickname: 'Santi',
    age: 24,
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
    ],
    bio: 'Diseñador en Mendoza. Si querés charlar con buena música nos vemos cerca de la cabina del DJ.',
    interests: ['Whisky', 'Rock', 'Trap'],
    drinkFavorite: 'Whisky',
    zodiacSign: 'Géminis',
    musicPreferences: ['Rock', 'Old School', 'Reggaeton'],
    instagram: '@santii.silva',
    gender: 'hombre',
    verifiedInVenue: true,
    lastPresenceCheck: 'Hace 12 min vía GPS',
    nightNote: {
      text: 'Team Whisky hoy 🥃',
      createdAt: minutesAgo(27),
      hearts: 5,
    },
  },
  {
    userId: 'usr_match_04',
    fullName: 'Camila Fontana',
    nickname: 'Cami',
    age: 21,
    avatarUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    ],
    bio: 'Amante del cachengue de corazón. Team Skyy o vino mendocino ⚡',
    interests: ['Skyy', 'Cumbia', 'Bachata y salsa'],
    drinkFavorite: 'Skyy',
    zodiacSign: 'Aries',
    musicPreferences: ['Reggaeton', 'Bachata y salsa', 'Cumbia'],
    instagram: '@camifontana_',
    gender: 'mujer',
    verifiedInVenue: true,
    lastPresenceCheck: 'Hace 5 min vía GPS',
    nightNote: {
      text: 'Si suena Daddy Yankee no me busquen 🔥',
      createdAt: minutesAgo(42),
      hearts: 11,
    },
  },
  {
    userId: 'usr_match_05',
    fullName: 'Lucas Navarro',
    nickname: 'Luqui',
    age: 25,
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    ],
    bio: 'De Godoy Cruz. Hoy no se duerme temprano. ¿Sale ese trago?',
    interests: ['Fernet', 'Cuarteto', 'Rock'],
    drinkFavorite: 'Fernet',
    zodiacSign: 'Sagitario',
    musicPreferences: ['Cuarteto', 'Rock', 'Cumbia'],
    instagram: '@lucasnavarro_ok',
    gender: 'hombre',
    verifiedInVenue: true,
    lastPresenceCheck: 'Hace 15 min vía QR',
    nightNote: {
      text: '¿Quién para un brindis en el patio? 🥂',
      createdAt: minutesAgo(35),
      hearts: 7,
    },
  },
  {
    userId: 'usr_match_06',
    fullName: 'Martina Albarracín',
    nickname: 'Marti',
    age: 22,
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    ],
    bio: 'Si me encontrás en la pista te enseño a bailar el paso prohibido 💃',
    interests: ['Vino', 'Bachata y salsa', 'Reggaeton'],
    drinkFavorite: 'Vino',
    zodiacSign: 'Libra',
    musicPreferences: ['Bachata y salsa', 'Reggaeton', 'Cumbia'],
    instagram: '@martinaalbarracin_',
    gender: 'mujer',
    verifiedInVenue: true,
    lastPresenceCheck: 'Hace 2 min vía GPS',
    nightNote: {
      text: 'Bailando cachengue hasta que cierren 💃',
      createdAt: minutesAgo(65),
    },
  },
];

export const MOCK_USER_TICKETS: UserTicket[] = [
  {
    id: 'tkt_user_991',
    eventId: 'evt_tonight_01',
    ticketTypeId: 'tkt_vip_01',
    ticketTypeName: 'Acceso VIP Terraza & Pista Alta',
    eventTitle: 'CACHENGUEOO FRIDAY',
    eventDate: 'Viernes 9 de Octubre · 00:00 — 06:00',
    qrCode: 'CACHE-TKT-VIP-991823-2026',
    holderName: 'Mateo Rossi',
    holderEmail: 'mateo.cachengueoo@gmail.com',
    price: 18000,
    purchasedAt: '2026-10-06T18:30:00Z',
    status: 'valid',
  },
];

export const MOCK_BENEFITS: ClubBenefit[] = [
  {
    id: 'ben_sportclub',
    title: 'SportClub · Gimnasio & Fitness',
    partnerName: 'SportClub Mendoza',
    highlightBadge: '10% OFF',
    description:
      'Por ser parte de Cachengueoo tenés el 10% de descuento en tu cuota de SportClub. Entrá a la web o escribí por WhatsApp e ingresá el código CACHESPORT para validar tu beneficio.',
    promoCode: 'CACHESPORT',
    actionUrl:
      'https://wa.me/5492615551234?text=Hola%20SportClub!%20Vengo%20de%20Cachengueoo%20y%20quiero%20activar%20mi%20beneficio%20del%2010%25%20OFF%20con%20el%20c%C3%B3digo%20CACHESPORT',
    actionType: 'whatsapp',
    actionLabel: 'Obtener beneficio',
    imageUrl:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    category: 'Gimnasio & Salud',
    condition: 'Válido presentando membresía o código CACHESPORT.',
    expiryTime: 'Vigente',
    tag: 'GIMNASIO',
    onlyMembers: false,
    active: true,
  },
];

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

export const INITIAL_MATCHES: MatchPair[] = [
  {
    id: 'match_01',
    userAId: 'usr_me_01',
    userBId: 'usr_match_01',
    eventId: 'evt_tonight_01',
    eventTitle: 'CACHENGUEOO FRIDAY',
    matchedAt: '2026-10-09T01:14:00Z',
    lastMessageSnippet: '¡Nos vemos en la barra VIP! Tengo un Fernet esperándote 😉',
    lastMessageAt: '01:25 hs',
    partnerProfile: MOCK_MATCH_PROFILES[0],
  },
  {
    id: 'match_02',
    userAId: 'usr_me_01',
    userBId: 'usr_match_02',
    eventId: 'evt_tonight_01',
    eventTitle: 'CACHENGUEOO FRIDAY',
    matchedAt: '2026-10-09T01:45:00Z',
    lastMessageSnippet: '¡Hola Mateo! ¿Estás cerca del escenario?',
    lastMessageAt: '01:48 hs',
    partnerProfile: MOCK_MATCH_PROFILES[1],
  },
];
