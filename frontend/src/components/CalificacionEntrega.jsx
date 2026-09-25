// =====================================================
// components/CalificacionEntrega.jsx  (NUEVO)
// · CalificacionChip: muestra la calificación (0-100) que el instructor
//   dio a la entrega de un aprendiz, con color según el resultado.
// · DetalleEntregaModal: vista de SOLO LECTURA de una entrega (lo que
//   entregó el aprendiz, su archivo, el estado, la calificación y la
//   retroalimentación del instructor). La usan Tareas y Entregas del
//   Administrador — no tiene ningún botón para calificar ni editar.
// =====================================================
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { entregasService } from '../services/api.js';
import { estadoBadge, formatFecha, LoadingCenter, portalDestino } from './helpers.jsx';

export function CalificacionChip({ valor }) {
  if (valor === null || valor === undefined || valor === '') {
    return <span className="badge badge-slate">Sin calificar</span>;
  }
  const n = Number(valor);
  const cls = n >= 80 ? 'badge-green' : n >= 60 ? 'badge-amber' : 'badge-red';
  return <span className={`badge ${cls}`}>{Number.isInteger(n) ? n : n.toFixed(1)} / 100</span>;
}

function Campo({ etiqueta, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
        {etiqueta}
      </div>
      <div style={{ fontSize: 13, color: 'var(--slate-800)' }}>{children}</div>
    </div>
  );
}

export function DetalleEntregaModal({ idEntrega, onClose }) {
  const [entrega, setEntrega] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    setEntrega(null); setError('');
    entregasService.getDetalle(idEntrega)
      .then(r => { if (vigente) setEntrega(r.data.data); })
      .catch(err => { if (vigente) setError(err.response?.data?.message || 'No se pudo cargar la entrega'); });
    return () => { vigente = false; };
  }, [idEntrega]);

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Revisión de entrega</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <div className="alert alert-error">{error}</div>}
          {!entrega && !error && <LoadingCenter />}
          {entrega && (
            <>
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                Vista de supervisión: solo lectura. La calificación la asigna el instructor responsable.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{entrega.titulo_tarea}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{entrega.nombre_proyecto}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {estadoBadge(entrega.estado)}
                  <CalificacionChip valor={entrega.calificacion} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Campo etiqueta="Aprendiz">{entrega.aprendiz_nombre}<br /><span style={{ color: 'var(--slate-500)', fontSize: 12 }}>cc {entrega.cc_aprendiz || '—'}</span></Campo>
                <Campo etiqueta="Instructor">{entrega.instructor_nombre}<br /><span style={{ color: 'var(--slate-500)', fontSize: 12 }}>cc {entrega.cc_instructor || '—'}</span></Campo>
                <Campo etiqueta="Entregada">{entrega.fecha_entrega ? new Date(entrega.fecha_entrega).toLocaleString('es-CO') : '—'}</Campo>
                <Campo etiqueta="Revisada">{entrega.fecha_revision ? new Date(entrega.fecha_revision).toLocaleString('es-CO') : 'Sin revisar'}</Campo>
              </div>

              <Campo etiqueta="Comentario del aprendiz">{entrega.comentario_aprendiz || <span style={{ color: 'var(--slate-400)' }}>Sin comentario</span>}</Campo>
              <Campo etiqueta="Material entregado">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {entrega.ruta_archivo && <a href={entrega.ruta_archivo} target="_blank" rel="noopener noreferrer">📄 Abrir archivo adjunto ↗</a>}
                  {entrega.url_entrega && <a href={entrega.url_entrega} target="_blank" rel="noopener noreferrer">🔗 Abrir enlace de la entrega ↗</a>}
                  {!entrega.ruta_archivo && !entrega.url_entrega && <span style={{ color: 'var(--slate-400)' }}>Sin archivo ni enlace</span>}
                </div>
              </Campo>

              <div style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '12px 14px' }}>
                <Campo etiqueta="Calificación del instructor"><CalificacionChip valor={entrega.calificacion} /></Campo>
                <div style={{ marginBottom: -14 }}>
                  <Campo etiqueta="Retroalimentación">
                    {entrega.observacion_instructor || <span style={{ color: 'var(--slate-400)' }}>Sin retroalimentación todavía</span>}
                  </Campo>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 10 }}>Vence: {formatFecha(entrega.fecha_vencimiento)}</div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>,
    portalDestino()
  );
}
