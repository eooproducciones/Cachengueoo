/**
 * Limpieza integral de datos de ejemplo (mock) en localStorage y estado local.
 * Esto asegura que tanto eventos, beneficios, usuarios y matches de prueba
 * sean removidos para que la aplicación comience 100% limpia para producción.
 */
export function purgeMockData(): void {
  try {
    const CLEANED_FLAG = 'cachengueoo_mock_data_purged_v2';
    if (localStorage.getItem(CLEANED_FLAG)) {
      return;
    }

    // 1. Limpiar eventos de ejemplo guardados previamente
    const savedEvents = localStorage.getItem('cachengueoo_events_list');
    if (savedEvents) {
      try {
        const events = JSON.parse(savedEvents);
        if (Array.isArray(events)) {
          const filtered = events.filter(
            (e: { id?: string }) =>
              e.id !== 'evt_tonight_01' &&
              e.id !== 'evt_saturday_02' &&
              e.id !== 'evt_special_03'
          );
          localStorage.setItem('cachengueoo_events_list', JSON.stringify(filtered));
        }
      } catch {
        localStorage.removeItem('cachengueoo_events_list');
      }
    } else {
      localStorage.setItem('cachengueoo_events_list', JSON.stringify([]));
    }

    // 2. Limpiar beneficios de ejemplo guardados previamente
    const savedBenefits = localStorage.getItem('cachengueoo_benefits_list');
    if (savedBenefits) {
      try {
        const benefits = JSON.parse(savedBenefits);
        if (Array.isArray(benefits)) {
          const filtered = benefits.filter(
            (b: { id?: string }) => b.id !== 'ben_sportclub'
          );
          localStorage.setItem('cachengueoo_benefits_list', JSON.stringify(filtered));
        }
      } catch {
        localStorage.removeItem('cachengueoo_benefits_list');
      }
    } else {
      localStorage.setItem('cachengueoo_benefits_list', JSON.stringify([]));
    }

    // 3. Limpiar matches, mensajes y swipes de prueba
    localStorage.removeItem('cachengueoo_user_matches');
    localStorage.removeItem('cachengueoo_chat_messages');
    localStorage.removeItem('cachengueoo_user_likes');
    localStorage.removeItem('cachengueoo_dismissed_profiles');

    // 4. Limpiar cumpleaños de ejemplo
    localStorage.removeItem('cachengueoo_birthday_requests');

    // 5. Limpiar tickets de ejemplo
    localStorage.removeItem('cachengueoo_user_tickets');

    // 6. Si el usuario actual es uno de los usuarios de ejemplo (Mateo Rossi o Juan Ignacio Pérez), limpiar la sesión
    const currentUser = localStorage.getItem('cachengueoo_current_user');
    if (currentUser) {
      try {
        const u = JSON.parse(currentUser);
        if (
          u.id === 'usr_me_01' ||
          u.id === 'usr_cachenguero_01' ||
          u.email === 'mateo.cachengueoo@gmail.com' ||
          u.email === 'usuario@cachengueoo.com'
        ) {
          localStorage.removeItem('cachengueoo_current_user');
          sessionStorage.removeItem('cachengueoo_current_user');
        }
      } catch {
        // Ignorar
      }
    }

    // 7. Limpiar lista de usuarios registrados de ejemplo
    localStorage.removeItem('cachengueoo_registered_users');

    // Marcar como purgado
    localStorage.setItem(CLEANED_FLAG, 'true');
  } catch (e) {
    console.warn('Notice purging mock data:', e);
  }
}
