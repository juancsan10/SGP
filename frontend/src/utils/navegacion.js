// =====================================================
// utils/navegacion.js
// Elementos de menú según el rol del usuario
// =====================================================

export function getNavItems(esAdmin = false, esInstructor = false) {
  // Instructor y Administrador supervisan las tareas de todos sus proyectos,
  // así que el menú dice «Tareas»; el Aprendiz ve solo las suyas.
  const supervisa = esAdmin || esInstructor;
  const items = [
    { label: 'Principal', section: true },
    { path: '/dashboard',      icon: '🏠', label: 'Inicio' },
    { path: '/proyectos',      icon: '📁', label: 'Proyectos' },
    { path: '/tareas',         icon: '✅', label: supervisa ? 'Tareas' : 'Mis Tareas' },
    { path: '/entregas',       icon: '📤', label: 'Entregas' },
    { path: '/notificaciones', icon: '🔔', label: 'Notificaciones' },
    { path: '/calendario',     icon: '🗓️', label: 'Calendario' },
    { path: '/timeline',       icon: '📈', label: 'Línea de tiempo' },
  ];

  if (esAdmin || esInstructor) {
    items.push({ label: 'Administración', section: true });
    items.push({ path: '/usuarios',  icon: '👥', label: 'Usuarios' });
    items.push({ path: '/historial', icon: '📋', label: 'Historial' });
  }

  return items;
}
