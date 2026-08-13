// =====================================================
// components/helpers.jsx
// Funciones de utilidad y componentes compartidos
// =====================================================

// ── Formatear fecha ───────────────────────────────────
export function formatFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Badge de estado de proyecto / tarea ──────────────
export function estadoBadge(estado) {
  const mapa = {
    'Activo':           'badge-green',
    'En curso':         'badge-green',
    'Completada':       'badge-green',
    'Entregado':        'badge-green',
    'Finalizado':       'badge-blue',
    'En Planificación': 'badge-amber',
    'Planeado':         'badge-amber',
    'En Revisión':      'badge-amber',
    'Pendiente':        'badge-slate',
    'Cancelado':        'badge-red',
    'Vencido':          'badge-red',
    'Rechazado':        'badge-red',
  };
  const cls = mapa[estado] || 'badge-slate';
  return <span className={`badge ${cls}`}>{estado || '—'}</span>;
}

// ── Badge de prioridad ────────────────────────────────
export function prioridadBadge(prioridad) {
  const mapa = {
    Alta:  'badge-red',
    Media: 'badge-amber',
    Baja:  'badge-blue',
  };
  const cls = mapa[prioridad] || 'badge-slate';
  return <span className={`badge ${cls}`}>{prioridad || '—'}</span>;
}

// ── Componente: barra de progreso ─────────────────────
export function ProgressBar({ value = 0 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress-wrap" style={{ flex: 1 }}>
        <div className="progress-bar" style={{ width: `${value}%` }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--slate-500)', width: 34, textAlign: 'right' }}>
        {value}%
      </span>
    </div>
  );
}

// ── Componente: spinner de carga ──────────────────────
export function LoadingCenter({ texto = 'Cargando…' }) {
  return (
    <div className="loading-center">
      <div className="spinner" />
      <span>{texto}</span>
    </div>
  );
}

// ── Componente: empty state ───────────────────────────
export function EmptyState({ icon = '📭', titulo, desc, accion }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{titulo}</h3>
      {desc && <p>{desc}</p>}
      {accion && <div style={{ marginTop: 16 }}>{accion}</div>}
    </div>
  );
}
