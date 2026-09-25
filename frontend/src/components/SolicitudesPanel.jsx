// =====================================================
// components/SolicitudesPanel.jsx  (NUEVO)
// Sección "Solicitudes" del panel de control.
// · Administrador: bandeja de solicitudes que envían Instructores y
//   Aprendices (atender/rechazar con respuesta) + las solicitudes de baja
//   de equipo pendientes que crean los instructores.
// · Instructor / Aprendiz: enviar una solicitud al Administrador y ver
//   su estado y la respuesta.
// =====================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { solicitudesService, equiposService, proyectosService } from '../services/api.js';
import { estadoBadge, Pagination, portalDestino } from './helpers.jsx';

const LIMITE = 5;

function rolBadge(rol) {
  return <span className={`badge ${rol === 'Instructor' ? 'badge-blue' : 'badge-green'}`}>{rol}</span>;
}
const fecha = (f) => (f ? new Date(f).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

// ── Modal de respuesta del Administrador ─────────────────────────
function ModalResolver({ accion, onClose, onHecho }) {
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const atender = accion.estado === 'Atendida' || accion.estado === 'Aprobar';
  const esEquipo = accion.tipoRegistro === 'equipo';

  async function enviar(e) {
    e.preventDefault(); setEnviando(true); setError('');
    try {
      if (esEquipo) await equiposService.resolverSolicitud(accion.item.id_solicitud, atender, respuesta.trim() || undefined);
      else await solicitudesService.resolver(accion.item.id_solicitud, accion.estado, respuesta.trim());
      onHecho();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo resolver la solicitud');
    } finally { setEnviando(false); }
  }

  const minimo = esEquipo ? 0 : 5;
  // Portal: el modal se monta en <body> para quedar por encima del encabezado fijo.
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {esEquipo ? (atender ? 'Aprobar baja de equipo' : 'Rechazar baja de equipo') : (atender ? 'Atender solicitud' : 'Rechazar solicitud')}
          </span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={enviar}>
          <div className="modal-body">
            <div style={{ background: 'var(--slate-50)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13 }}>
              <strong>{esEquipo ? `Retirar a ${accion.item.nombre_afectado}` : accion.item.asunto}</strong>
              <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                {esEquipo ? `${accion.item.nombre_proyecto} · solicitada por ${accion.item.nombre_instructor}` : `${accion.item.solicitante_nombre} · ${accion.item.tipo}`}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{esEquipo ? 'Observación (opcional)' : 'Respuesta para el solicitante *'}</label>
              <textarea className="form-textarea" rows={4} value={respuesta} maxLength={2000}
                onChange={e => setRespuesta(e.target.value)}
                placeholder={atender ? 'Explica qué se hizo o cómo se resolvió…' : 'Explica por qué no procede…'} />
              <span className="form-hint">El solicitante la recibirá como notificación.</span>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className={`btn ${atender ? 'btn-primary' : 'btn-danger'}`}
              disabled={enviando || respuesta.trim().length < minimo}>
              {enviando ? 'Guardando…' : atender ? (esEquipo ? 'Aprobar' : 'Marcar como atendida') : 'Rechazar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    portalDestino()
  );
}

// ── Administrador ────────────────────────────────────────────────
function SolicitudesAdmin() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('Pendiente');
  const [rol, setRol] = useState('');
  const [filas, setFilas] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit: LIMITE, offset: 0, resumen: { Pendiente: 0, Atendida: 0, Rechazada: 0 } });
  const [offset, setOffset] = useState(0);
  const [bajas, setBajas] = useState([]);
  const [accion, setAccion] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  async function cargar() {
    setError('');
    try {
      const params = { limit: LIMITE, offset };
      if (filtro) params.estado = filtro;
      if (rol) params.rol = rol;
      const [r, b] = await Promise.allSettled([solicitudesService.getAll(params), equiposService.listSolicitudes('Pendiente')]);
      if (r.status === 'fulfilled') { setFilas(r.value.data.data || []); setMeta(r.value.data.meta); }
      else setError(r.reason?.response?.data?.message || 'No se pudieron cargar las solicitudes');
      if (b.status === 'fulfilled') setBajas(b.value.data.data || []);
    } catch { setError('No se pudieron cargar las solicitudes'); }
  }
  useEffect(() => { cargar(); }, [filtro, rol, offset]); // eslint-disable-line
  useEffect(() => { setOffset(0); }, [filtro, rol]);

  const pendientesTotales = (meta.resumen?.Pendiente || 0) + bajas.length;
  const pestañas = [['Pendiente', 'Pendientes'], ['Atendida', 'Atendidas'], ['Rechazada', 'Rechazadas'], ['', 'Todas']];

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <span>📨</span><strong>Solicitudes de instructores y aprendices</strong>
        {pendientesTotales > 0 && <span className="badge badge-red">{pendientesTotales} pendiente(s)</span>}
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          {pestañas.map(([v, l]) => (
            <button key={l} className={`btn btn-sm ${filtro === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltro(v)}>
              {l}{v && meta.resumen ? ` · ${meta.resumen[v] ?? 0}` : ''}
            </button>
          ))}
          <select className="form-select" style={{ maxWidth: 150, padding: '4px 8px', fontSize: 12 }} value={rol} onChange={e => setRol(e.target.value)}>
            <option value="">Todos los roles</option>
            <option value="Instructor">Instructores</option>
            <option value="Aprendiz">Aprendices</option>
          </select>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {aviso && <div className="alert alert-success">{aviso}</div>}

        {filtro === 'Pendiente' && bajas.length > 0 && (
          <div style={{ border: '1px solid var(--amber-500)', background: 'var(--amber-100)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>👥 Bajas de equipo solicitadas por instructores</div>
            {bajas.map(s => (
              <div key={`eq-${s.id_solicitud}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid rgba(0,0,0,.06)', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12 }}>
                  <strong>{s.nombre_afectado}</strong> (cc {s.identificacion_afectado || '—'}) · {s.nombre_proyecto}
                  <div style={{ color: 'var(--slate-600)' }}>Solicitada por {s.nombre_instructor}{s.motivo ? ` — ${s.motivo}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/proyectos/${s.id_proyecto}`)}>Ver proyecto</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setAccion({ tipoRegistro: 'equipo', estado: 'Rechazar', item: s })}>Rechazar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setAccion({ tipoRegistro: 'equipo', estado: 'Aprobar', item: s })}>Aprobar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filas.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <div className="empty-state-icon">📭</div>
            <h3>{filtro === 'Pendiente' ? 'No hay solicitudes pendientes' : 'Sin solicitudes en esta vista'}</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filas.map(s => (
              <div key={s.id_solicitud} style={{ border: '1px solid var(--slate-200)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <span className="badge badge-slate">{s.tipo}</span>{estadoBadge(s.estado)}
                      {s.proyecto_nombre && <span style={{ fontSize: 11, color: 'var(--slate-500)' }}>📁 {s.proyecto_nombre}</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.asunto}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {s.solicitante_nombre} {rolBadge(s.solicitante_rol)} · cc {s.solicitante_cc || '—'} · {fecha(s.fecha_solicitud)}
                    </div>
                  </div>
                  {s.estado === 'Pendiente' && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setAccion({ estado: 'Rechazada', item: s })}>Rechazar</button>
                      <button className="btn btn-primary btn-sm" onClick={() => setAccion({ estado: 'Atendida', item: s })}>Atender</button>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--slate-700)', margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{s.descripcion}</p>
                {s.respuesta_admin && (
                  <div style={{ marginTop: 8, fontSize: 12, background: 'var(--slate-50)', borderRadius: 8, padding: '8px 10px' }}>
                    <strong>Respuesta:</strong> {s.respuesta_admin}
                    <span style={{ color: 'var(--slate-400)' }}> · {fecha(s.fecha_resolucion)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <Pagination total={meta.total} limit={meta.limit} offset={meta.offset} onChange={setOffset} />
      </div>
      {accion && (
        <ModalResolver accion={accion} onClose={() => setAccion(null)}
          onHecho={async () => { setAviso('Solicitud resuelta; el solicitante fue notificado.'); setAccion(null); await cargar(); }} />
      )}
    </div>
  );
}

// ── Instructor / Aprendiz ─────────────────────────────────────────
function MisSolicitudes() {
  const [filas, setFilas] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ tipo: '', asunto: '', descripcion: '', id_proyecto: '' });
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    try { const r = await solicitudesService.mias(); setFilas(r.data.data || []); }
    catch (err) { setError(err.response?.data?.message || 'No se pudieron cargar tus solicitudes'); }
  }
  useEffect(() => {
    cargar();
    solicitudesService.tipos().then(r => setTipos(r.data.data || [])).catch(() => {});
    proyectosService.getAll().then(r => setProyectos(r.data.data || [])).catch(() => {});
  }, []);

  async function enviar(e) {
    e.preventDefault(); setEnviando(true); setError('');
    try {
      await solicitudesService.create({ ...form, id_proyecto: form.id_proyecto || undefined });
      setModal(false); setForm({ tipo: '', asunto: '', descripcion: '', id_proyecto: '' });
      setAviso('Solicitud enviada. El administrador te responderá por notificación.');
      await cargar();
    } catch (err) { setError(err.response?.data?.message || 'No se pudo enviar la solicitud'); }
    finally { setEnviando(false); }
  }

  const valido = form.tipo && form.asunto.trim().length >= 5 && form.descripcion.trim().length >= 10;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span>📨</span><strong>Mis solicitudes al Administrador</strong></div>
        <button className="btn btn-primary btn-sm" onClick={() => { setError(''); setModal(true); }}>+ Nueva solicitud</button>
      </div>
      <div className="card-body">
        {aviso && <div className="alert alert-success">{aviso}</div>}
        {error && !modal && <div className="alert alert-error">{error}</div>}
        {filas.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
            ¿Necesitas corregir tus datos, soporte técnico o ayuda con tu cuenta o proyecto? Envía una solicitud al administrador.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filas.map(s => (
              <div key={s.id_solicitud} style={{ border: '1px solid var(--slate-200)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div><span className="badge badge-slate" style={{ marginRight: 6 }}>{s.tipo}</span><strong style={{ fontSize: 13 }}>{s.asunto}</strong></div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>{fecha(s.fecha_solicitud)}</span>{estadoBadge(s.estado)}
                  </div>
                </div>
                {s.respuesta_admin && (
                  <div style={{ marginTop: 6, fontSize: 12, background: 'var(--slate-50)', borderRadius: 8, padding: '6px 10px' }}>
                    <strong>Respuesta del administrador:</strong> {s.respuesta_admin}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && createPortal(
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nueva solicitud al Administrador</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={enviar}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Tipo *</label>
                    <select className="form-select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} required>
                      <option value="">Selecciona…</option>
                      {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Proyecto (opcional)</label>
                    <select className="form-select" value={form.id_proyecto} onChange={e => setForm({ ...form, id_proyecto: e.target.value })}>
                      <option value="">Ninguno</option>
                      {proyectos.map(p => <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Asunto *</label>
                  <input className="form-input" maxLength={150} value={form.asunto} onChange={e => setForm({ ...form, asunto: e.target.value })}
                    placeholder="Ej. Corregir mi número de identificación" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción *</label>
                  <textarea className="form-textarea" rows={4} maxLength={5000} value={form.descripcion}
                    onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Cuéntale al administrador qué necesitas…" />
                </div>
                {error && <div className="alert alert-error">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={!valido || enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
              </div>
            </form>
          </div>
        </div>,
        portalDestino()
      )}
    </div>
  );
}

export default function SolicitudesPanel({ esAdmin }) {
  return esAdmin ? <SolicitudesAdmin /> : <MisSolicitudes />;
}
