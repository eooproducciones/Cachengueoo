/**
 * Servicio de extracción inteligente de información desde enlaces públicos de Passline.
 * Absorbe automáticamente Banner, Título, Fecha y Descripción desde el link.
 */

export interface PasslineExtractedData {
  title: string;
  dateStr: string;
  dateIso?: string;
  description: string;
  flyerUrl: string;
  passlineUrl: string;
}

// Las 4 opciones de banner predeterminadas para selección
export const FOUR_PRESET_FLYERS = [
  {
    id: 'cachengue',
    label: 'Cachengue & RKT',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'neon',
    label: 'Fiesta Fluo / Neon',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'sunset',
    label: 'Sunset / Verano',
    url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'retro',
    label: 'Retro / 2000s',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
  },
];

// Banners de alta resolución por temática para eventos de Cachengueoo
export const THEMED_FLYERS: Record<string, { label: string; url: string }> = {
  halloween: {
    label: 'Halloween / Terror',
    url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
  },
  brujas: {
    label: 'Noche de Brujas',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
  },
  retro: {
    label: 'Fiesta Retro / 90s & 2000s',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
  },
  primavera: {
    label: 'Primavera Fest',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
  },
  spring: {
    label: 'Spring Break',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
  },
  verano: {
    label: 'Verano / Sunset',
    url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
  },
  sunset: {
    label: 'Sunset & Open Air',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
  },
  cachengue: {
    label: 'Cachengue & RKT',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
  },
  bresh: {
    label: 'Fiesta Bresh / Pachanga',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
  },
  fluo: {
    label: 'Fiesta Fluo / Neon Glow',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
  },
  neon: {
    label: 'Neon Nights',
    url: 'https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=1200&q=80',
  },
  aniversario: {
    label: 'Aniversario & Gala',
    url: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=1200&q=80',
  },
  cumple: {
    label: 'Cumpleaños / Festejo',
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80',
  },
  vip: {
    label: 'VIP Gold Edition',
    url: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80',
  },
  viernes: {
    label: 'Viernes Clásico',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
  },
  sabado: {
    label: 'Sábado Exclusivo',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
  },
  default: {
    label: 'Cachengueoo Mendoza',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
  },
};

const MONTHS_ES: Record<string, { name: string; number: string }> = {
  enero: { name: 'Enero', number: '01' },
  febrero: { name: 'Febrero', number: '02' },
  marzo: { name: 'Marzo', number: '03' },
  abril: { name: 'Abril', number: '04' },
  mayo: { name: 'Mayo', number: '05' },
  junio: { name: 'Junio', number: '06' },
  julio: { name: 'Julio', number: '07' },
  agosto: { name: 'Agosto', number: '08' },
  septiembre: { name: 'Septiembre', number: '09' },
  setiembre: { name: 'Septiembre', number: '09' },
  octubre: { name: 'Octubre', number: '10' },
  noviembre: { name: 'Noviembre', number: '11' },
  diciembre: { name: 'Diciembre', number: '12' },
};

const DAYS_ES: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  miércoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  sábado: 'Sábado',
  domingo: 'Domingo',
};

export const passlineParser = {
  /**
   * Recopila y absorbe la información de la fiesta directamente del enlace público de Passline
   */
  extractFromUrl(rawUrl: string): PasslineExtractedData {
    const cleanUrl = rawUrl.trim();
    if (!cleanUrl) {
      return {
        title: '',
        dateStr: '',
        description: '',
        flyerUrl: THEMED_FLYERS.default.url,
        passlineUrl: 'https://www.passline.com',
      };
    }

    // 1. Obtener el slug del link de Passline
    let slug = '';
    try {
      const urlObj = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/').filter(Boolean);

      if (segments.includes('eventos')) {
        const idx = segments.indexOf('eventos');
        slug = segments[idx + 1] || segments[segments.length - 1] || '';
      } else if (segments.includes('eventos-plano')) {
        const idx = segments.indexOf('eventos-plano');
        slug = segments[idx + 1] || segments[segments.length - 1] || '';
      } else if (segments.includes('sitio-evento')) {
        const idx = segments.indexOf('sitio-evento');
        slug = segments[idx + 1] || segments[segments.length - 1] || '';
      } else {
        slug = segments[segments.length - 1] || '';
      }
    } catch {
      const parts = cleanUrl.split('?')[0].split('#')[0].replace(/\/$/, '').split('/');
      slug = parts[parts.length - 1] || '';
    }

    // Limpiar slug
    slug = decodeURIComponent(slug).toLowerCase().replace(/[?#].*$/, '');

    // 2. Extraer Fecha detectada en el slug
    let detectedDate = '';
    let detectedIso = '';
    let foundMonth = '';
    let foundMonthNum = '';
    let foundDayNum = '';
    let foundDayName = '';

    for (const [key, val] of Object.entries(MONTHS_ES)) {
      if (slug.includes(key)) {
        foundMonth = val.name;
        foundMonthNum = val.number;
        break;
      }
    }

    for (const [key, val] of Object.entries(DAYS_ES)) {
      if (slug.includes(key)) {
        foundDayName = val;
        break;
      }
    }

    // Buscar número de día (1 a 31) en el slug
    const dayMatch = slug.match(/(?:^|-|_|\b)(\d{1,2})(?:-|_|\b|$)/);
    if (dayMatch) {
      const num = parseInt(dayMatch[1], 10);
      if (num >= 1 && num <= 31) {
        foundDayNum = num.toString();
      }
    }

    const currentYear = new Date().getFullYear();

    if (foundDayNum && foundMonth && foundMonthNum) {
      const dayPrefix = foundDayName || 'Viernes';
      detectedDate = `${dayPrefix} ${foundDayNum} de ${foundMonth}`;
      detectedIso = `${currentYear}-${foundMonthNum}-${foundDayNum.padStart(2, '0')}`;
    } else if (foundMonth && foundMonthNum) {
      const dayPrefix = foundDayName || 'Sábado';
      detectedDate = `${dayPrefix} 24 de ${foundMonth}`;
      detectedIso = `${currentYear}-${foundMonthNum}-24`;
    }

    // 3. Extraer y Formatear Nombre del Evento (limpio para que el usuario pueda editarlo)
    let formattedTitle = slug
      .replace(/[-_]+/g, ' ')
      .replace(/\b\d{4}\b/g, '') // sacar año aislado (ej: 2026)
      .replace(/\b(eventos|passline|sitio)\b/gi, '')
      .trim();

    // Reemplazos de palabras y acentos comunes
    formattedTitle = formattedTitle
      .replace(/\bdia\b/gi, 'Día')
      .replace(/\bsabado\b/gi, 'Sábado')
      .replace(/\bedicion\b/gi, 'Edición')
      .replace(/\bclasico\b/gi, 'Clásico')
      .replace(/\bmusica\b/gi, 'Música');

    // Capitalizar palabras
    formattedTitle = formattedTitle
      .split(' ')
      .filter(Boolean)
      .map((w) => (w.length > 2 ? w.toUpperCase() : w))
      .join(' ')
      .trim();

    if (!formattedTitle || formattedTitle.length < 2) {
      formattedTitle = 'CACHENGUEOO LIVE EDITION';
    }

    // Asegurar prefijo Cachengueoo si no lo trae
    if (!formattedTitle.toUpperCase().includes('CACHENGUE')) {
      formattedTitle = `CACHENGUEOO · ${formattedTitle.toUpperCase()}`;
    }

    // 4. Seleccionar Banner temático según palabras clave en el slug
    let selectedFlyer = THEMED_FLYERS.default.url;
    for (const [theme, flyerObj] of Object.entries(THEMED_FLYERS)) {
      if (slug.includes(theme)) {
        selectedFlyer = flyerObj.url;
        break;
      }
    }

    // 5. Descripción sugerida
    const description = `Venta oficial vía Passline para ${formattedTitle} en Cachengueoo Boliche (Mendoza). Ingreso válido presentando tu código QR emitido por Passline. Capacidad limitada y ambiente climatizado.`;

    return {
      title: formattedTitle,
      dateStr: detectedDate,
      dateIso: detectedIso || undefined,
      description,
      flyerUrl: selectedFlyer,
      passlineUrl: cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`,
    };
  },
};
