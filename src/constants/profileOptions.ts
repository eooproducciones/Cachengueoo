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
