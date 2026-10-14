// =====================================================
// components/helpers.jsx
// Funciones de utilidad y componentes compartidos
// =====================================================
import { useEffect, useRef, useState } from 'react';

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
    'Aprobada':         'badge-green',
    'Corregida':        'badge-green',
    'Finalizado':       'badge-blue',
    'Entregada':        'badge-blue',
    'En Planificación': 'badge-amber',
    'Planeado':         'badge-amber',
    'En Revisión':      'badge-amber',
    'En revisión':      'badge-amber',
    'Requiere corrección': 'badge-amber',
    'Pendiente':        'badge-slate',
    'Cancelado':        'badge-red',
    'Vencido':          'badge-red',
    'Rechazado':        'badge-red',
    'Rechazada':        'badge-red',   // NUEVO: solicitudes
    'Atendida':         'badge-green', // NUEVO: solicitudes
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

// ── Componente: paginación numerada (NUEVO, reutilizable en cualquier
//    sección que liste datos con meta.total/limit/offset) ────────────
export function Pagination({ total, limit, offset, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;
  if (totalPages <= 1) return null;

  const irA = (pagina) => onChange(Math.max(0, (pagina - 1) * limit));

  const paginas = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) paginas.push(p);
    else if (paginas[paginas.length - 1] !== '…') paginas.push('…');
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 }}>
      <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => irA(currentPage - 1)}>‹ Anterior</button>
      {paginas.map((p, i) => p === '…'
        ? <span key={`e${i}`} style={{ padding: '0 6px', color: 'var(--slate-400)' }}>…</span>
        : (
          <button
            key={p}
            onClick={() => irA(p)}
            className="btn btn-sm"
            style={{
              minWidth: 34,
              background: p === currentPage ? 'var(--role-primary, var(--green-600))' : 'var(--white)',
              color: p === currentPage ? 'var(--white)' : 'var(--slate-700)',
              border: p === currentPage ? 'none' : '1.5px solid var(--slate-200)',
              fontWeight: p === currentPage ? 700 : 500,
            }}
          >
            {p}
          </button>
        )
      )}
      <button className="btn btn-secondary btn-sm" disabled={currentPage === totalPages} onClick={() => irA(currentPage + 1)}>Siguiente ›</button>
      <span style={{ fontSize: 12, color: 'var(--slate-500)', marginLeft: 10 }}>{total} en total</span>
    </div>
  );
}

// ── Componente: modal de confirmación con ícono de advertencia (NUEVO)
//    Reemplaza el confirm() nativo del navegador para acciones sensibles
//    (desactivar, eliminar) con un aviso más claro y botones diferenciados. ──
export function ConfirmModal({ abierto, tipo = 'advertencia', titulo, mensaje, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar', cargando = false, onConfirmar, onCancelar }) {
  if (!abierto) return null;
  const estilos = {
    advertencia: { icono: '⚠️', color: 'var(--amber-700)', bg: 'var(--amber-100)', btn: 'btn-primary' },
    peligro:     { icono: '🛑', color: 'var(--red-600)',   bg: 'var(--red-50)',   btn: 'btn-danger'  },
    info:        { icono: 'ℹ️', color: 'var(--blue-600)',  bg: 'var(--blue-100)', btn: 'btn-primary' },
  }[tipo];

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: 'center', paddingTop: 28 }}>
          <div className={`confirm-icon ${tipo}`} style={{
            width: 56, height: 56, borderRadius: '50%', background: estilos.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, margin: '0 auto 14px',
          }}>
            <span>{estilos.icono}</span>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 8 }}>
            {titulo}
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--slate-600)', lineHeight: 1.5 }}>{mensaje}</p>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onCancelar} disabled={cargando}>{textoCancelar}</button>
          <button className={`btn ${estilos.btn}`} onClick={onConfirmar} disabled={cargando}>
            {cargando ? 'Procesando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Destino de los portales de modales (NUEVO) ─────────
// Los modales que se abren desde dentro de una tarjeta se montan con
// createPortal para quedar por encima del encabezado fijo. Se montan en
// el contenedor del rol (.role-admin/.role-instructor/.role-aprendiz) y no
// en <body>, para conservar el color de acento de cada rol.
export function portalDestino() {
  return document.querySelector('.role-admin, .role-instructor, .role-aprendiz') || document.body;
}

// ── Número animado (NUEVO) ─────────────────────────────
// Cuenta desde el valor anterior (0 al montar) hasta el nuevo valor.
// Si el sistema pide "reducir movimiento", muestra el número directo.
export function NumeroAnimado({ valor, duracion = 900 }) {
  const destino = Number(valor) || 0;
  const [mostrado, setMostrado] = useState(0);
  const desde = useRef(0);
  useEffect(() => {
    const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducir || destino === desde.current) { setMostrado(destino); desde.current = destino; return; }
    const inicio = performance.now();
    const origen = desde.current;
    let frame;
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const suave = 1 - Math.pow(1 - t, 3); // ease-out cúbico
      setMostrado(Math.round(origen + (destino - origen) * suave));
      if (t < 1) frame = requestAnimationFrame(paso);
      else desde.current = destino;
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [destino, duracion]);
  return <>{mostrado}</>;
}
