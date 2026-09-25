// =====================================================
// pages/EntregasPage.jsx
// Aprendiz: entrega/corrige sus tareas (sin cambios).
// Instructor: revisa/califica entregas (sin cambios).
// Administrador: revisa (solo lectura) cada entrega: lo que
// entregó el aprendiz, la calificación y la retroalimentación
// del instructor. No califica — el backend lo rechaza.
// Instructor: al revisar asigna una calificación de 0 a 100
// (obligatoria para aprobar).
// =====================================================
import { useEffect, useState } from 'react';
import { proyectosService, tareasService, entregasService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingCenter, EmptyState, formatFecha, estadoBadge, Pagination } from '../components/helpers.jsx';
import { CalificacionChip, DetalleEntregaModal } from '../components/CalificacionEntrega.jsx';

export default function EntregasPage() {
  const { esAdmin } = useAuth();
  return esAdmin ? <EntregasSupervisionAdmin /> : <EntregasOperativas />;
}

// ── Administrador: solo lectura, listado global (NUEVO) ─────────
const LIMITE = 10;
function EntregasSupervisionAdmin() {
  const [entregas, setEntregas] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit: LIMITE, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // NUEVO: aviso visible si falla la carga
  const [cc, setCc] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [estado, setEstado] = useState('');
  const [offset, setOffset] = useState(0);
  const [entregaVer, setEntregaVer] = useState(null); // NUEVO

  async function cargar() {
    setLoading(true); setError('');
    try {
      const params = { limit: LIMITE, offset };
      if (cc) params.cc = cc;
      if (proyecto) params.proyecto = proyecto;
      if (estado) params.estado = estado;
      const r = await entregasService.getAllAdmin(params);
      setEntregas(r.data.data || []);
      setMeta(r.data.meta || { total: 0, limit: LIMITE, offset: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar las entregas');
    }
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, [offset, estado]); // eslint-disable-line
  useEffect(() => { setOffset(0); }, [cc, proyecto, estado]);
  useEffect(() => {
    const t = setTimeout(() => { if (offset === 0) cargar(); }, 350);
    return () => clearTimeout(t);
  }, [cc, proyecto]); // eslint-disable-line

  if (loading && entregas.length === 0) return (
    <div>
      <div className="page-header"><div className="page-header-left"><h1 className="page-title">Entregas</h1></div></div>
      <LoadingCenter />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Entregas</h1>
          <p className="page-subtitle">Supervisión de todos los proyectos · {meta.total} entrega(s)</p>
        </div>
      </div>
      <div className="page-body">
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <input className="form-input" style={{ maxWidth:220 }} placeholder="🔍  cc aprendiz o instructor…"
            value={cc} onChange={e => setCc(e.target.value.replace(/[^A-Za-z0-9.-]/g, ''))} />
          <input className="form-input" style={{ maxWidth:220 }} placeholder="Nombre del proyecto…"
            value={proyecto} onChange={e => setProyecto(e.target.value)} />
          <select className="form-select" value={estado} onChange={e=>setEstado(e.target.value)} style={{ maxWidth:190 }}>
            <option value="">Todos los estados</option>
            {['Entregada','Requiere corrección','Corregida','En revisión','Aprobada'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {(cc || proyecto || estado) && (
            <button className="btn btn-ghost" onClick={() => { setCc(''); setProyecto(''); setEstado(''); }}>
              Limpiar filtros ×
            </button>
          )}
        </div>

        {/* NUEVO: aviso visible si falla la carga */}
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {entregas.length === 0 ? (
          <EmptyState icon="📤" titulo="Sin entregas" desc="No hay entregas que coincidan con los filtros." />
        ) : (
          <>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tarea</th><th>Proyecto</th><th>Estado</th><th>Calificación</th>
                      <th>Aprendiz (cc)</th><th>Instructor (cc)</th><th>Fecha</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entregas.map(e => (
                      <tr key={e.id_entrega}>
                        <td><strong>{e.titulo_tarea}</strong></td>
                        <td><span className="badge badge-slate">{e.nombre_proyecto}</span></td>
                        <td>{estadoBadge(e.estado)}</td>
                        <td><CalificacionChip valor={e.calificacion} /></td>
                        <td style={{ fontSize:12 }}>{e.aprendiz_nombre}<br/><span style={{ color:'var(--slate-500)' }}>{e.cc_aprendiz || '—'}</span></td>
                        <td style={{ fontSize:12 }}>{e.instructor_nombre}<br/><span style={{ color:'var(--slate-500)' }}>{e.cc_instructor || '—'}</span></td>
                        <td style={{ fontSize:12 }}>{formatFecha(e.fecha_entrega)}</td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEntregaVer(e.id_entrega)}>👁️ Revisar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination total={meta.total} limit={meta.limit} offset={meta.offset} onChange={setOffset} />
          </>
        )}
      </div>

      {entregaVer && <DetalleEntregaModal idEntrega={entregaVer} onClose={() => setEntregaVer(null)} />}
    </div>
  );
}

// ── Aprendiz / Instructor: flujo operativo existente (sin cambios) ──
function EntregasOperativas() {
  const { usuario, esInstructor, esAprendiz } = useAuth();
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [entrega, setEntrega] = useState(null);
  const [form, setForm] = useState({ comentario_aprendiz: '', url_entrega: '', ruta_archivo: '' });
  const [revision, setRevision] = useState({ estado: 'Aprobada', observacion_instructor: '', calificacion: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const p = await proyectosService.getAll();
      const ps = p.data.data || [];
      const rs = await Promise.allSettled(
        ps.map(x => tareasService.getByProyecto(x.id_proyecto).then(
          r => (r.data.data || []).map(t => ({ ...t, proyecto_nombre: x.nombre }))
        ))
      );
      setTareas(rs.filter(x => x.status === 'fulfilled').flatMap(x => x.value));
    } catch (e) {
      setError('No se pudieron cargar las tareas');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  const visibles = tareas.filter(t => esAprendiz ? Number(t.id_asignado) === Number(usuario?.id_usuario) : true);

  async function abrir(t, tipo) {
    setError(''); setEntrega(null); setModal({ t, tipo });
    try {
      const r = await entregasService.getByTarea(t.id_tarea);
      setEntrega(r.data.data);
      if (tipo === 'entrega') {
        setForm({
          comentario_aprendiz: r.data.data?.comentario_aprendiz || '',
          url_entrega: r.data.data?.url_entrega || '',
          ruta_archivo: r.data.data?.ruta_archivo || '',
        });
      } else {
        setRevision({
          estado: r.data.data?.estado === 'Requiere corrección' ? 'Requiere corrección' : 'Aprobada',
          observacion_instructor: r.data.data?.observacion_instructor || '',
          calificacion: r.data.data?.calificacion ?? '',
        });
      }
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo cargar la entrega');
    }
  }

  async function enviar(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await entregasService.submit(modal.t.id_tarea, form);
      setModal(null);
      await cargar();
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo enviar');
    } finally {
      setSaving(false);
    }
  }

  async function revisar(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await entregasService.review(modal.t.id_tarea, revision);
      setModal(null);
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo guardar la revisión');
    } finally {
      setSaving(false);
    }
  }

  const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  const TAMANO_MAXIMO_MB = 10;

  async function subirArchivo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setError('');

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      setError('Solo se permiten archivos PDF, JPG, PNG o WEBP');
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
      setError(`El archivo supera el tamaño máximo permitido (${TAMANO_MAXIMO_MB} MB)`);
      return;
    }

    setSubiendoArchivo(true);
    try {
      await entregasService.uploadArchivo(modal.t.id_tarea, archivo, {
        comentario_aprendiz: form.comentario_aprendiz,
        url_entrega: form.url_entrega,
      });
      setModal(null);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al subir el archivo');
    } finally {
      setSubiendoArchivo(false);
    }
  }

  if (loading) return <LoadingCenter />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Entregas</h1>
          <p className="page-subtitle">{esAprendiz ? 'Entrega y corrección de tus tareas' : 'Revisión de entregas de tus proyectos'}</p>
        </div>
      </div>
      <div className="page-body">
        {visibles.length === 0 ? (
          <EmptyState icon="📤" titulo="Sin tareas" desc="No hay tareas disponibles para gestionar entregas." />
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Tarea</th><th>Proyecto</th><th>Asignado</th><th>Vencimiento</th><th>Acción</th></tr>
                </thead>
                <tbody>
                  {visibles.map(t => (
                    <tr key={t.id_tarea}>
                      <td><strong>{t.titulo}</strong></td>
                      <td>{t.proyecto_nombre}</td>
                      <td>{t.asignado_nombre}</td>
                      <td>{formatFecha(t.fecha_vencimiento)}</td>
                      <td>
                        {esAprendiz && Number(t.id_asignado) === Number(usuario?.id_usuario) && (
                          <button className="btn btn-primary btn-sm" onClick={() => abrir(t, 'entrega')}>📤 Entregar / corregir</button>
                        )}
                        {esInstructor && (
                          <button className="btn btn-secondary btn-sm" onClick={() => abrir(t, 'revision')}>🔎 Revisar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal.tipo === 'entrega' ? 'Entrega de tarea' : 'Revisión de entrega'}</span>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={modal.tipo === 'entrega' ? enviar : revisar}>
              <div className="modal-body">
                <strong>{modal.t.titulo}</strong>
                {error && <div className="alert alert-error">{error}</div>}
                {entrega?.estado && <div className="badge badge-blue">Estado: {entrega.estado}</div>}

                {modal.tipo === 'entrega' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Comentario</label>
                      <textarea className="form-textarea" value={form.comentario_aprendiz}
                        onChange={e => setForm({ ...form, comentario_aprendiz: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Enlace</label>
                      <input className="form-input" type="url" value={form.url_entrega}
                        onChange={e => setForm({ ...form, url_entrega: e.target.value })} placeholder="https://…" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Archivo</label>
                      {form.ruta_archivo && (
                        <p style={{ fontSize: 12, marginBottom: 6 }}>
                          <a href={form.ruta_archivo} target="_blank" rel="noreferrer">📄 Ver archivo actual</a>
                        </p>
                      )}
                      <label className="btn btn-secondary btn-sm" style={{ cursor: subiendoArchivo ? 'not-allowed' : 'pointer', opacity: subiendoArchivo ? 0.6 : 1 }}>
                        {subiendoArchivo ? 'Subiendo…' : '📎 Adjuntar y enviar con archivo'}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
                          disabled={subiendoArchivo} onChange={subirArchivo} />
                      </label>
                      <span className="form-hint" style={{ display: 'inline-flex', marginLeft: 8 }}>
                        PDF, JPG, PNG o WEBP · máx. 10 MB
                      </span>
                    </div>

                    {entrega?.estado === 'Requiere corrección' && (
                      <div className="alert alert-info">Esta entrega requiere corrección. Al enviarla pasará a <strong>Corregida</strong>.</div>
                    )}
                  </>
                ) : (
                  <>
                    {entrega ? (
                      <>
                        <div className="alert alert-info">Aprendiz: {entrega.aprendiz_nombre} · Identificación: {entrega.identificacion}</div>
                        {entrega.comentario_aprendiz && <div>{entrega.comentario_aprendiz}</div>}
                        {entrega.url_entrega && <a href={entrega.url_entrega} target="_blank" rel="noreferrer">Abrir entrega ↗</a>}
                        {entrega.ruta_archivo && <div><a href={entrega.ruta_archivo} target="_blank" rel="noreferrer">📄 Ver archivo adjunto ↗</a></div>}
                      </>
                    ) : (
                      <div className="alert alert-info">Esta tarea todavía no tiene entrega.</div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Resultado</label>
                      <select className="form-select" value={revision.estado}
                        onChange={e => setRevision({ ...revision, estado: e.target.value })}>
                        <option>En revisión</option>
                        <option>Requiere corrección</option>
                        <option>Aprobada</option>
                      </select>
                    </div>
                    {/* NUEVO: calificación 0-100, obligatoria para aprobar */}
                    <div className="form-group">
                      <label className="form-label">Calificación (0 a 100){revision.estado === 'Aprobada' ? ' *' : ''}</label>
                      <input className="form-input" type="number" min="0" max="100" step="0.1" style={{ maxWidth: 140 }}
                        value={revision.calificacion}
                        onChange={e => setRevision({ ...revision, calificacion: e.target.value })} />
                      <span className="form-hint">Obligatoria para aprobar la entrega</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Retroalimentación</label>
                      <textarea className="form-textarea" value={revision.observacion_instructor}
                        onChange={e => setRevision({ ...revision, observacion_instructor: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-primary" disabled={saving || (modal.tipo === 'revision' && !entrega)}>
                  {saving ? 'Guardando…' : modal.tipo === 'entrega' ? 'Enviar sin archivo' : 'Guardar revisión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
