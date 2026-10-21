export interface ZodiacSignOption {
  name: string;
  symbol: string;
  element: string;
}

export const ZODIAC_SIGNS: ZodiacSignOption[] = [
  { name: 'Aries', symbol: '♈', element: 'Fuego' },
  { name: 'Tauro', symbol: '♉', element: 'Tierra' },
  { name: 'Géminis', symbol: '♊', element: 'Aire' },
  { name: 'Cáncer', symbol: '♋', element: 'Agua' },
  { name: 'Leo', symbol: '♌', element: 'Fuego' },
  { name: 'Virgo', symbol: '♍', element: 'Tierra' },
  { name: 'Libra', symbol: '♎', element: 'Aire' },
  { name: 'Escorpio', symbol: '♏', element: 'Agua' },
  { name: 'Sagitario', symbol: '♐', element: 'Fuego' },
  { name: 'Capricornio', symbol: '♑', element: 'Tierra' },
  { name: 'Acuario', symbol: '♒', element: 'Aire' },
  { name: 'Piscis', symbol: '♓', element: 'Agua' },
];

export const MUSIC_GENRES: string[] = [
  'Reggaeton',
  'Cuarteto',
  'Cumbia',
  'Rock',
  'Old School',
  'Bachata y salsa',
  'RKT',
  'Trap',
  'Pop',
  'Electrónica',
  'Cachengue 2000s',
];

export const DRINK_OPTIONS: string[] = [
  'Fernet',
  'Skyy',
  'Agua',
  'Gin',
  'Whisky',
  'Vino',
  'Cerveza',
  'Aperol',
];

export const PRESET_AVATARS: { url: string; label: string }[] = [
  {
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    label: 'Fiesta Flash',
  },
  {
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
    label: 'Barra VIP',
  },
  {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    label: 'Terraza Night',
  },
  {
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    label: 'Pista Dance',
  },
  {
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    label: 'Club Neon',
  },
  {
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    label: 'Noche Mendoza',
  },
  {
    url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80',
    label: 'Glam Night',
  },
  {
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
    label: 'After Chic',
  },
];
