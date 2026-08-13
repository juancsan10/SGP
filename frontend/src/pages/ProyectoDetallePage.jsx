// =====================================================
// pages/ProyectoDetallePage.jsx
// Vista detallada de un proyecto con pestañas:
// Fases · Tareas · Equipo · Mensajes · Repositorios
// =====================================================
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  proyectosService, fasesService, tareasService,
  equiposService, mensajesService, repositoriosService,
  entregablesService, usuariosService,
} from '../services/api.js';
import { estadoBadge, prioridadBadge, ProgressBar, LoadingCenter, formatFecha } from '../components/helpers.jsx';

const TABS = ['Resumen','Fases','Tareas','Equipo','Mensajes','Repositorios'];

export default function ProyectoDetallePage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { esAdmin, esInstructor, usuario } = useAuth();
  const canEdit  = esAdmin || esInstructor;

  const [tab,       setTab]       = useState('Resumen');
  const [proyecto,  setProyecto]  = useState(null);
  const [fases,     setFases]     = useState([]);
  const [tareas,    setTareas]    = useState([]);
  const [equipo,    setEquipo]    = useState([]);
  const [mensajes,  setMensajes]  = useState([]);
  const [repos,     setRepos]     = useState([]);
  const [usuarios,  setUsuarios]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // ── Mensajes ──────────────────────────────────────
  const [msgTexto,  setMsgTexto]  = useState('');
  const mensajesEndRef = useRef(null);

  // ── Modales rápidos ───────────────────────────────
  const [modalFase,  setModalFase]  = useState(false);
  const [modalTarea, setModalTarea] = useState(false);
  const [modalEquip, setModalEquip] = useState(false);
  const [modalRepo,  setModalRepo]  = useState(false);

  const [formFase,  setFormFase]  = useState({ nombre_fase:'', descripcion:'', fecha_inicio:'', fecha_fin:'' });
  const [formTarea, setFormTarea] = useState({ titulo:'', descripcion:'', prioridad:'Media', fecha_vencimiento:'', id_asignado:'' });
  const [formEquip, setFormEquip] = useState({ id_usuario:'', rol_en_equipo:'' });
  const [formRepo,  setFormRepo]  = useState({ url_github:'', rama_principal:'main' });
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');

  async function cargar() {
    setLoading(true);
    try {
      const [pRes, fRes, tRes, eRes, mRes, rRes, uRes] = await Promise.all([
        proyectosService.getById(id),
        fasesService.getByProyecto(id),
        tareasService.getByProyecto(id),
        equiposService.getByProyecto(id),
        mensajesService.getByProyecto(id),
        repositoriosService.getByProyecto(id),
        usuariosService.getAll(),
      ]);
      setProyecto(pRes.data.data);
      setFases(fRes.data.data || []);
      setTareas(tRes.data.data || []);
      setEquipo(eRes.data.data || []);
      setMensajes(mRes.data.data || []);
      setRepos(rRes.data.data || []);
      setUsuarios(uRes.data.data || []);
    } catch (err) {
      setError('No se pudo cargar el proyecto');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, [id]);
  useEffect(() => {
    if (tab === 'Mensajes') {
      setTimeout(() => mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [tab, mensajes]);

  // ── Crear Fase ────────────────────────────────────
  async function crearFase(e) {
    e.preventDefault(); setSaving(true); setSaveError('');
    try {
      await fasesService.create({ ...formFase, id_proyecto: id });
      setModalFase(false);
      const r = await fasesService.getByProyecto(id);
      setFases(r.data.data || []);
    } catch (err) { setSaveError(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  }

  // ── Crear Tarea ───────────────────────────────────
  async function crearTarea(e) {
    e.preventDefault(); setSaving(true); setSaveError('');
    try {
      await tareasService.create({ ...formTarea, id_proyecto: id });
      setModalTarea(false);
      const r = await tareasService.getByProyecto(id);
      setTareas(r.data.data || []);
    } catch (err) { setSaveError(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  }

  // ── Agregar a equipo ──────────────────────────────
  async function crearEquipo(e) {
    e.preventDefault(); setSaving(true); setSaveError('');
    try {
      await equiposService.create({ ...formEquip, id_proyecto: id });
      setModalEquip(false);
      const r = await equiposService.getByProyecto(id);
      setEquipo(r.data.data || []);
    } catch (err) { setSaveError(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  }

  // ── Crear Repositorio ─────────────────────────────
  async function crearRepo(e) {
    e.preventDefault(); setSaving(true); setSaveError('');
    try {
      await repositoriosService.create({ ...formRepo, id_proyecto: id });
      setModalRepo(false);
      const r = await repositoriosService.getByProyecto(id);
      setRepos(r.data.data || []);
    } catch (err) { setSaveError(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  }

  // ── Enviar mensaje ────────────────────────────────
  async function enviarMensaje(e) {
    e.preventDefault();
    if (!msgTexto.trim()) return;
    try {
      await mensajesService.create({ contenido: msgTexto, id_proyecto: id });
      setMsgTexto('');
      const r = await mensajesService.getByProyecto(id);
      setMensajes(r.data.data || []);
    } catch (err) { console.error(err); }
  }

  // ── Actualizar estado de tarea ────────────────────
  async function actualizarEstadoTarea(idTarea, estado) {
    try {
      await tareasService.update(idTarea, { estado });
      const r = await tareasService.getByProyecto(id);
      setTareas(r.data.data || []);
    } catch (err) { console.error(err); }
  }

  if (loading) return <LoadingCenter />;
  if (error)   return <div style={{ padding: 40 }}><div className="alert alert-error">{error}</div></div>;
  if (!proyecto) return null;

  return (
    <div>
      {/* ── Cabecera ──────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/proyectos')} style={{marginBottom:4}}>
            ← Volver
          </button>
          <h1 className="page-title">{proyecto.nombre}</h1>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
            {estadoBadge(proyecto.estado)}
            <span className="page-subtitle">Instructor: {proyecto.instructor}</span>
          </div>
        </div>
        <div>
          <ProgressBar value={parseFloat(proyecto.porcentaje_avance) || 0} />
          <div style={{ fontSize:11, color:'var(--slate-500)', marginTop:4, textAlign:'right' }}>
            {formatFecha(proyecto.fecha_inicio)} → {formatFecha(proyecto.fecha_fin)}
          </div>
        </div>
      </div>

      {/* ── Pestañas ──────────────────────────────── */}
      <div style={{ background:'var(--white)', borderBottom:'1px solid var(--slate-300)', paddingLeft:28 }}>
        <div style={{ display:'flex', gap:0 }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding:'10px 18px', border:'none', background:'transparent',
                borderBottom: tab===t ? '2px solid var(--green-600)' : '2px solid transparent',
                color: tab===t ? 'var(--green-600)' : 'var(--slate-500)',
                fontWeight: tab===t ? 600 : 400,
                fontSize:13, cursor:'pointer', transition:'all .15s',
              }}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="page-body">

        {/* ─────── RESUMEN ─────────────────────────── */}
        {tab === 'Resumen' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div className="card">
              <div className="card-header"><span>📋</span><strong>Información general</strong></div>
              <div className="card-body">
                <InfoRow label="Descripción" value={proyecto.descripcion || '—'} />
                <InfoRow label="Estado"      value={estadoBadge(proyecto.estado)} />
                <InfoRow label="Avance"      value={<ProgressBar value={parseFloat(proyecto.porcentaje_avance)||0} />} />
                <InfoRow label="Inicio"      value={formatFecha(proyecto.fecha_inicio)} />
                <InfoRow label="Fin"         value={formatFecha(proyecto.fecha_fin)} />
                <InfoRow label="Instructor"  value={proyecto.instructor} />
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span>📊</span><strong>Estadísticas rápidas</strong></div>
              <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <MiniStat icon="📂" label="Fases"   valor={fases.length} />
                <MiniStat icon="✅" label="Tareas"  valor={tareas.length} />
                <MiniStat icon="👥" label="Equipo"  valor={equipo.length} />
                <MiniStat icon="💬" label="Mensajes"valor={mensajes.length} />
                <MiniStat icon="📁" label="Repos"   valor={repos.length} />
              </div>
            </div>
          </div>
        )}

        {/* ─────── FASES ───────────────────────────── */}
        {tab === 'Fases' && (
          <div>
            {canEdit && (
              <div style={{ marginBottom:16 }}>
                <button className="btn btn-primary" onClick={() => { setFormFase({nombre_fase:'',descripcion:'',fecha_inicio:'',fecha_fin:''}); setSaveError(''); setModalFase(true); }}>
                  + Nueva fase
                </button>
              </div>
            )}
            {fases.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="empty-state-icon">📂</div><h3>Sin fases</h3><p>Agrega la primera fase del proyecto.</p></div></div>
            ) : fases.map(f => (
              <div key={f.id_fase} className="card" style={{ marginBottom:12 }}>
                <div className="card-header">
                  <span>📂</span>
                  <strong>{f.nombre_fase}</strong>
                  <span style={{ marginLeft:'auto', fontSize:12, color:'var(--slate-500)' }}>
                    {formatFecha(f.fecha_inicio)} → {formatFecha(f.fecha_fin)}
                  </span>
                </div>
                <div className="card-body">
                  {f.descripcion && <p style={{ fontSize:13, color:'var(--slate-600)', marginBottom:12 }}>{f.descripcion}</p>}
                  <ProgressBar value={parseFloat(f.porcentaje_avance)||0} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─────── TAREAS ──────────────────────────── */}
        {tab === 'Tareas' && (
          <div>
            {canEdit && (
              <div style={{ marginBottom:16 }}>
                <button className="btn btn-primary" onClick={() => { setFormTarea({titulo:'',descripcion:'',prioridad:'Media',fecha_vencimiento:'',id_asignado:''}); setSaveError(''); setModalTarea(true); }}>
                  + Nueva tarea
                </button>
              </div>
            )}
            {tareas.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="empty-state-icon">✅</div><h3>Sin tareas</h3></div></div>
            ) : (
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead><tr>
                      <th>Tarea</th><th>Prioridad</th><th>Estado</th>
                      <th>Asignado</th><th>Vencimiento</th><th>Avance</th>
                      {canEdit && <th></th>}
                    </tr></thead>
                    <tbody>
                      {tareas.map(t => (
                        <tr key={t.id_tarea}>
                          <td><strong>{t.titulo}</strong><div style={{fontSize:11,color:'var(--slate-500)'}}>{t.descripcion}</div></td>
                          <td>{prioridadBadge(t.prioridad)}</td>
                          <td>{estadoBadge(t.estado)}</td>
                          <td>{t.asignado_nombre}</td>
                          <td>{formatFecha(t.fecha_vencimiento)}</td>
                          <td style={{ minWidth:120 }}><ProgressBar value={parseFloat(t.porcentaje_avance)||0} /></td>
                          {canEdit && (
                            <td>
                              <select
                                className="form-select"
                                value={t.estado || ''}
                                style={{ fontSize:11, padding:'4px 6px' }}
                                onChange={e => actualizarEstadoTarea(t.id_tarea, e.target.value)}
                              >
                                {['Pendiente','En curso','Completada','Cancelada'].map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────── EQUIPO ──────────────────────────── */}
        {tab === 'Equipo' && (
          <div>
            {canEdit && (
              <div style={{ marginBottom:16 }}>
                <button className="btn btn-primary" onClick={() => { setFormEquip({id_usuario:'',rol_en_equipo:''}); setSaveError(''); setModalEquip(true); }}>
                  + Agregar miembro
                </button>
              </div>
            )}
            {equipo.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="empty-state-icon">👥</div><h3>Sin miembros en el equipo</h3></div></div>
            ) : (
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Nombre</th><th>Correo</th><th>Rol sistema</th><th>Rol en proyecto</th></tr></thead>
                    <tbody>
                      {equipo.map(m => (
                        <tr key={m.id_equipo}>
                          <td><strong>{m.nombre_usuario}</strong></td>
                          <td>{m.correo}</td>
                          <td><span className="badge badge-blue">{m.rol}</span></td>
                          <td>{m.rol_en_equipo || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────── MENSAJES ────────────────────────── */}
        {tab === 'Mensajes' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card" style={{ maxHeight:460, overflowY:'auto' }}>
              <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
                {mensajes.length === 0 && (
                  <div className="empty-state"><div className="empty-state-icon">💬</div><h3>Sin mensajes aún</h3><p>Sé el primero en escribir.</p></div>
                )}
                {mensajes.map(m => {
                  const esPropio = m.id_remitente === usuario.id;
                  return (
                    <div key={m.id_mensaje} style={{ display:'flex', gap:10, flexDirection: esPropio ? 'row-reverse' : 'row' }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background: esPropio ? 'var(--green-600)' : 'var(--slate-300)', color: esPropio ? 'white' : 'var(--slate-700)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>
                        {(m.remitente_nombre || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ maxWidth:'70%' }}>
                        <div style={{ fontSize:10, color:'var(--slate-500)', marginBottom:3, textAlign: esPropio ? 'right' : 'left' }}>
                          {m.remitente_nombre} · {new Date(m.fecha_envio).toLocaleString('es-CO')}
                        </div>
                        <div style={{ background: esPropio ? 'var(--green-50)' : 'var(--slate-100)', borderRadius: esPropio ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding:'8px 12px', fontSize:13, color:'var(--slate-800)', border:'1px solid', borderColor: esPropio ? 'var(--green-100)' : 'var(--slate-200)' }}>
                          {m.contenido}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={mensajesEndRef} />
              </div>
            </div>
            <form onSubmit={enviarMensaje} style={{ display:'flex', gap:10 }}>
              <input
                className="form-input"
                value={msgTexto}
                onChange={e => setMsgTexto(e.target.value)}
                placeholder="Escribe un mensaje…"
                style={{ flex:1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={!msgTexto.trim()}>
                Enviar ✉️
              </button>
            </form>
          </div>
        )}

        {/* ─────── REPOSITORIOS ────────────────────── */}
        {tab === 'Repositorios' && (
          <div>
            {canEdit && (
              <div style={{ marginBottom:16 }}>
                <button className="btn btn-primary" onClick={() => { setFormRepo({url_github:'',rama_principal:'main'}); setSaveError(''); setModalRepo(true); }}>
                  + Vincular repositorio
                </button>
              </div>
            )}
            {repos.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="empty-state-icon">📁</div><h3>Sin repositorios vinculados</h3></div></div>
            ) : repos.map(r => (
              <div key={r.id_repositorio} className="card" style={{ marginBottom:12 }}>
                <div className="card-body" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:700, marginBottom:4 }}>🔗 {r.url_github}</div>
                    <div style={{ fontSize:12, color:'var(--slate-500)' }}>
                      Rama: <strong>{r.rama_principal}</strong> · Actualizado: {formatFecha(r.ultima_actualizacion)}
                    </div>
                  </div>
                  <a href={r.url_github} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                    Abrir ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Modal Fase ────────────────────────────── */}
      <FormModal
        open={modalFase} title="Nueva fase"
        onClose={() => setModalFase(false)}
        onSubmit={crearFase} saving={saving} error={saveError}
      >
        <div className="form-group">
          <label className="form-label">Nombre de la fase *</label>
          <input className="form-input" value={formFase.nombre_fase}
            onChange={e=>setFormFase({...formFase,nombre_fase:e.target.value})} required />
        </div>
        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea className="form-textarea" value={formFase.descripcion}
            onChange={e=>setFormFase({...formFase,descripcion:e.target.value})} />
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="form-group">
            <label className="form-label">Fecha inicio</label>
            <input className="form-input" type="date" value={formFase.fecha_inicio}
              onChange={e=>setFormFase({...formFase,fecha_inicio:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Fecha fin</label>
            <input className="form-input" type="date" value={formFase.fecha_fin}
              onChange={e=>setFormFase({...formFase,fecha_fin:e.target.value})} />
          </div>
        </div>
      </FormModal>

      {/* ─── Modal Tarea ───────────────────────────── */}
      <FormModal
        open={modalTarea} title="Nueva tarea"
        onClose={() => setModalTarea(false)}
        onSubmit={crearTarea} saving={saving} error={saveError}
      >
        <div className="form-group">
          <label className="form-label">Título *</label>
          <input className="form-input" value={formTarea.titulo}
            onChange={e=>setFormTarea({...formTarea,titulo:e.target.value})} required />
        </div>
        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea className="form-textarea" value={formTarea.descripcion}
            onChange={e=>setFormTarea({...formTarea,descripcion:e.target.value})} />
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="form-group">
            <label className="form-label">Prioridad</label>
            <select className="form-select" value={formTarea.prioridad}
              onChange={e=>setFormTarea({...formTarea,prioridad:e.target.value})}>
              {['Alta','Media','Baja'].map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha vencimiento</label>
            <input className="form-input" type="date" value={formTarea.fecha_vencimiento}
              onChange={e=>setFormTarea({...formTarea,fecha_vencimiento:e.target.value})} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Asignar a *</label>
          <select className="form-select" value={formTarea.id_asignado}
            onChange={e=>setFormTarea({...formTarea,id_asignado:e.target.value})} required>
            <option value="">Seleccionar usuario</option>
            {usuarios.map(u=>(
              <option key={u.id_usuario} value={u.id_usuario}>
                {u.nombres} {u.apellidos} ({u.rol})
              </option>
            ))}
          </select>
        </div>
      </FormModal>

      {/* ─── Modal Equipo ──────────────────────────── */}
      <FormModal
        open={modalEquip} title="Agregar miembro al equipo"
        onClose={() => setModalEquip(false)}
        onSubmit={crearEquipo} saving={saving} error={saveError}
      >
        <div className="form-group">
          <label className="form-label">Usuario *</label>
          <select className="form-select" value={formEquip.id_usuario}
            onChange={e=>setFormEquip({...formEquip,id_usuario:e.target.value})} required>
            <option value="">Seleccionar usuario</option>
            {usuarios.filter(u=>!equipo.find(e=>e.id_usuario===u.id_usuario)).map(u=>(
              <option key={u.id_usuario} value={u.id_usuario}>
                {u.nombres} {u.apellidos} ({u.rol})
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Rol en el proyecto</label>
          <input className="form-input" placeholder="Ej: Líder técnico" value={formEquip.rol_en_equipo}
            onChange={e=>setFormEquip({...formEquip,rol_en_equipo:e.target.value})} />
        </div>
      </FormModal>

      {/* ─── Modal Repositorio ─────────────────────── */}
      <FormModal
        open={modalRepo} title="Vincular repositorio"
        onClose={() => setModalRepo(false)}
        onSubmit={crearRepo} saving={saving} error={saveError}
      >
        <div className="form-group">
          <label className="form-label">URL de GitHub *</label>
          <input className="form-input" placeholder="https://github.com/usuario/repo"
            value={formRepo.url_github}
            onChange={e=>setFormRepo({...formRepo,url_github:e.target.value})} required />
        </div>
        <div className="form-group">
          <label className="form-label">Rama principal</label>
          <input className="form-input" value={formRepo.rama_principal}
            onChange={e=>setFormRepo({...formRepo,rama_principal:e.target.value})} />
        </div>
      </FormModal>
    </div>
  );
}

// ── Sub-componentes de utilidad ───────────────────────
function InfoRow({ label, value }) {
  return (
    <div style={{ display:'flex', gap:12, marginBottom:10, alignItems:'flex-start' }}>
      <span style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', textTransform:'uppercase', letterSpacing:'.04em', width:90, flexShrink:0, paddingTop:2 }}>{label}</span>
      <div style={{ flex:1, fontSize:13, color:'var(--slate-800)' }}>{value}</div>
    </div>
  );
}

function MiniStat({ icon, label, valor }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <span style={{ fontSize:13 }}>{icon} {label}</span>
      <strong style={{ fontSize:18, fontFamily:'var(--font-display)' }}>{valor}</strong>
    </div>
  );
}

function FormModal({ open, title, onClose, onSubmit, saving, error, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            {children}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
