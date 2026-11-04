// =====================================================
// utils/filtros.js
// Funciones puras de filtrado para proyectos y tareas
// =====================================================

export function filtrarProyectos(proyectos = [], filtro = '') {
  const lista = Array.isArray(proyectos) ? proyectos : [];
  const query = (filtro || '').toLowerCase().trim();
  if (!query) return lista;
  return lista.filter(p =>
    (p.nombre || '').toLowerCase().includes(query) ||
    (p.instructor || '').toLowerCase().includes(query)
  );
}

export function filtrarTareas(tareas = [], filtro = '', estado = '') {
  const lista = Array.isArray(tareas) ? tareas : [];
  const query = (filtro || '').toLowerCase().trim();
  return lista.filter(t => {
    const matchTexto = !query ||
      (t.titulo || '').toLowerCase().includes(query) ||
      (t.asignado_nombre || '').toLowerCase().includes(query) ||
      (t.proyecto_nombre || '').toLowerCase().includes(query);
    const matchEstado = !estado || t.estado === estado;
    return matchTexto && matchEstado;
  });
}
