/**
 * Formatea un timestamp ISO a texto relativo en español para las notitas:
 * "recién", "hace 5 min", "hace 1 h", etc.
 */
export function formatTimeAgo(isoString?: string): string {
  if (!isoString) return 'hace un momento';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return 'recién';
  }
  if (diffMinutes === 1) {
    return 'hace 1 min';
  }
  if (diffMinutes < 60) {
    return `hace ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) {
    return 'hace 1 h';
  }
  if (diffHours < 24) {
    return `hace ${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

/**
 * Formatea el tiempo restante para que se borre una notita o historia (duración de 1 hora)
 * Retorna "45 min", "12 min", "58 seg", etc.
 */
export function formatTimeRemaining(isoStringCreatedAt?: string, durationMinutes: number = 60): string {
  if (!isoStringCreatedAt) return '59 min';

  const createdTime = new Date(isoStringCreatedAt).getTime();
  const expireTime = createdTime + durationMinutes * 60 * 1000;
  const now = Date.now();
  const diffMs = expireTime - now;

  if (diffMs <= 0) {
    return '1 min';
  }

  const minutesLeft = Math.floor(diffMs / (60 * 1000));
  if (minutesLeft < 1) {
    const secondsLeft = Math.max(1, Math.floor(diffMs / 1000));
    return `${secondsLeft} seg`;
  }

  if (minutesLeft >= 60) {
    const hoursLeft = Math.floor(minutesLeft / 60);
    const minsRem = minutesLeft % 60;
    return minsRem > 0 ? `${hoursLeft}h ${minsRem}m` : `${hoursLeft}h`;
  }

  return `${minutesLeft} min`;
}
