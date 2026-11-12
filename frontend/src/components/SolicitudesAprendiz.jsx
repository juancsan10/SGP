// =====================================================
// components/SolicitudesAprendiz.jsx  (NUEVO — punto 10, #19)
// Creación de aprendices con aprobación del Administrador.
// · NuevoAprendizModal: el Instructor llena TODOS los datos y envía la
//   solicitud (no crea la cuenta directamente).
// · MisSolicitudesAprendiz: el Instructor sigue el estado y la respuesta.
// · SolicitudesAprendizAdmin: el Administrador aprueba (crea la cuenta y la
//   suma al equipo del proyecto) o rechaza con una respuesta.
// =====================================================
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { proyectosService, solicitudesAprendizService } from '../services/api.js';
import { estadoBadge, Pagination, portalDestino, ModalHeader, NotaObligatorios, useModalAccesible } from './helpers.jsx';
import { validarNombre, validarCorreo, validarCc, validarPassword } from '../utils/validaciones.js';

const VACIO = { nombres: '', apellidos: '', correo: '', identificacion: '', ficha: '', programa_formacion: '', id_proyecto: '', contrasena: '' };
const fecha = (f) => (f ? new Date(f).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// Validación en el navegador (el backend repite las mismas reglas).
export function validarSolicitudAprendiz(f) {
  const e = {};
  if (!validarNombre(f.nombres)) e.nombres = 'Debe tener entre 2 y 100 caracteres';
  if (!validarNombre(f.apellidos)) e.apellidos = 'Debe tener entre 2 y 100 caracteres';
  if (!validarCorreo(f.correo)) e.correo = 'Correo electrónico no válido';
  if (!validarCc(f.identificacion)) e.identificacion = 'Entre 5 y 15 dígitos, sin puntos ni espacios';
  if (!f.ficha.trim()) e.ficha = 'La ficha es obligatoria';
  if (f.programa_formacion.trim().length < 3) e.programa_formacion = 'El programa de formación es obligatorio';
  if (!f.id_proyecto) e.id_proyecto = 'Selecciona el proyecto';
  if (!validarPassword(f.contrasena)) e.contrasena = 'Mínimo 8 caracteres, con al menos una letra y un número';
  return e;
}

function Campo({ id, etiqueta, error, ayuda, children }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{etiqueta} *</label>
      {children}
      {error
        ? <span className="form-hint" id={`${id}-error`} style={{ color: 'var(--red-600, #dc2626)' }}>{error}</span>
        : ayuda && <span className="form-hint">{ayuda}</span>}
    </div>
  );
}

export function NuevoAprendizModal({ abierto, onClose, onEnviada }) {
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [proyectos, setProyectos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const ref = useModalAccesible(abierto, enviando ? undefined : onClose);

  useEffect(() => {
    if (!abierto) return;
    setForm(VACIO); setErrores({}); setError('');
    proyectosService.getAll()
      .then(r => {
        const lista = r.data.data || [];
        setProyectos(lista);
        if (lista.length === 1) setForm(f => ({ ...f, id_proyecto: String(lista[0].id_proyecto) }));
      })
      .catch(() => setError('No se pudieron cargar tus proyectos'));
  }, [abierto]);

  if (!abierto) return null;

  const cambiar = (campo) => (e) => {
    const valor = campo === 'identificacion' ? e.target.value.replace(/\D/g, '') : e.target.value;
    setForm(f => ({ ...f, [campo]: valor }));
    if (errores[campo]) setErrores(er => ({ ...er, [campo]: undefined }));
  };
  const props = (campo) => ({
    id: `aprendiz-${campo}`, className: 'form-input', value: form[campo], onChange: cambiar(campo), required: true,
    'aria-invalid': !!errores[campo], 'aria-describedby': errores[campo] ? `aprendiz-${campo}-error` : undefined,
  });

  async function enviar(e) {
    e.preventDefault(); setError('');
    const errs = validarSolicitudAprendiz(form);
    setErrores(errs);
    if (Object.keys(errs).length) return;
    setEnviando(true);
    try {
      const r = await solicitudesAprendizService.crear({ ...form, id_proyecto: Number(form.id_proyecto) });
      onEnviada?.(r.data.message || 'Solicitud enviada al Administrador');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo enviar la solicitud');
    } finally {
      setEnviando(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={enviando ? undefined : onClose}>
      <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="nuevo-aprendiz-titulo" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <ModalHeader id="nuevo-aprendiz-titulo" icono="🎓" titulo="Solicitar nuevo aprendiz"
          descripcion="El Administrador revisará los datos. Al aprobarla se crea la cuenta y el aprendiz entra al equipo del proyecto."
          onClose={enviando ? undefined : onClose} />
        <form onSubmit={enviar} noValidate>
          <div className="modal-body">
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <div className="form-grid-2">
              <Campo id="aprendiz-nombres" etiqueta="Nombres" error={errores.nombres}><input {...props('nombres')} maxLength={100} /></Campo>
              <Campo id="aprendiz-apellidos" etiqueta="Apellidos" error={errores.apellidos}><input {...props('apellidos')} maxLength={100} /></Campo>
              <Campo id="aprendiz-correo" etiqueta="Correo electrónico" error={errores.correo}>
                <input {...props('correo')} type="email" maxLength={150} placeholder="nombre@sena.edu.co" />
              </Campo>
              <Campo id="aprendiz-identificacion" etiqueta="Identificación (cc)" error={errores.identificacion}>
                <input {...props('identificacion')} inputMode="numeric" maxLength={15} placeholder="Ej. 1098765001" />
              </Campo>
              <Campo id="aprendiz-ficha" etiqueta="Ficha" error={errores.ficha}><input {...props('ficha')} maxLength={50} placeholder="Ej. 3228970" /></Campo>
              <Campo id="aprendiz-programa_formacion" etiqueta="Programa de formación" error={errores.programa_formacion}>
                <input {...props('programa_formacion')} maxLength={150} placeholder="Ej. Análisis y Desarrollo de Software" />
              </Campo>
            </div>
            <Campo id="aprendiz-id_proyecto" etiqueta="Proyecto" error={errores.id_proyecto} ayuda="Al aprobarse, entra directamente al equipo de este proyecto.">
              <select {...props('id_proyecto')} className="form-select">
                <option value="">Selecciona uno de tus proyectos</option>
                {proyectos.map(p => <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre}</option>)}
              </select>
            </Campo>
            <Campo id="aprendiz-contrasena" etiqueta="Contraseña temporal" error={errores.contrasena}
              ayuda="Compártela con el aprendiz; podrá cambiarla al ingresar.">
              <input {...props('contrasena')} type="password" autoComplete="new-password" maxLength={128} />
            </Campo>
          </div>
          <div className="modal-footer">
            <NotaObligatorios />
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={enviando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
          </div>
        </form>
      </div>
    </div>,
    portalDestino()
  );
}

// ── Instructor: estado de sus solicitudes ─────────────
export function MisSolicitudesAprendiz({ recargar = 0 }) {
  const [filas, setFilas] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    solicitudesAprendizService.mias()
      .then(r => { setFilas(r.data.data || []); setError(''); })
      .catch(err => setError(err.response?.data?.message || 'No se pudieron cargar tus solicitudes de aprendices'));
  }, [recargar]);

  if (!error && filas.length === 0) return null;
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header"><strong>🎓 Mis solicitudes de nuevos aprendices</strong></div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {filas.map(s => (
          <div key={s.id_solicitud_aprendiz} style={{ border: '1px solid var(--slate-200)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: 13 }}>{s.nombres} {s.apellidos}</strong>
                <span style={{ fontSize: 12, color: 'var(--slate-500)' }}> · {s.proyecto_nombre || 'Sin proyecto'} · ficha {s.ficha}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--slate-500)' }}>{fecha(s.fecha_solicitud)}</span>{estadoBadge(s.estado)}
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
    </div>
  );
}

// ── Administrador: aprobar o rechazar ─────────────────
function ModalResolverAprendiz({ accion, onClose, onHecho }) {
  const aprobar = accion.estado === 'Aprobada';
  const [respuesta, setRespuesta] = useState(aprobar ? 'Datos verificados. Cuenta creada.' : '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const ref = useModalAccesible(true, enviando ? undefined : onClose);
  const s = accion.solicitud;

  async function confirmar(e) {
    e.preventDefault(); setError('');
    if (respuesta.trim().length < 5) { setError('Escribe una respuesta para el instructor (mínimo 5 caracteres).'); return; }
    setEnviando(true);
    try {
      const r = await solicitudesAprendizService.resolver(s.id_solicitud_aprendiz, accion.estado, respuesta.trim());
      onHecho(r.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo resolver la solicitud');
      setEnviando(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={enviando ? undefined : onClose}>
      <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="resolver-aprendiz-titulo" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <ModalHeader id="resolver-aprendiz-titulo" icono={aprobar ? '✅' : '⛔'}
          titulo={aprobar ? 'Aprobar y crear aprendiz' : 'Rechazar solicitud de aprendiz'}
          descripcion={aprobar
            ? `Se creará la cuenta de ${s.nombres} ${s.apellidos} y entrará al equipo de "${s.proyecto_nombre || 'su proyecto'}".`
            : 'No se crea ninguna cuenta. El instructor verá tu respuesta.'}
          onClose={enviando ? undefined : onClose} />
        <form onSubmit={confirmar}>
          <div className="modal-body">
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <div className="form-group">
              <label className="form-label" htmlFor="respuesta-aprendiz">Respuesta para el instructor *</label>
              <textarea id="respuesta-aprendiz" className="form-textarea" value={respuesta} onChange={e => setRespuesta(e.target.value)}
                placeholder={aprobar ? '' : 'Ej. La ficha no corresponde al programa indicado'} required minLength={5} />
            </div>
          </div>
          <div className="modal-footer">
            <NotaObligatorios />
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={enviando}>Cancelar</button>
            <button type="submit" className={`btn ${aprobar ? 'btn-primary' : 'btn-danger'}`} disabled={enviando}>
              {enviando ? 'Guardando…' : aprobar ? 'Aprobar y crear' : 'Rechazar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    portalDestino()
  );
}

const LIMITE = 5;
export function SolicitudesAprendizAdmin() {
  const [filas, setFilas] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit: LIMITE, offset: 0, resumen: {} });
  const [estado, setEstado] = useState('Pendiente');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [accion, setAccion] = useState(null);

  function cargar() {
    solicitudesAprendizService.getAll({ limit: LIMITE, offset, estado: estado || undefined })
      .then(r => { setFilas(r.data.data || []); setMeta(r.data.meta || { total: 0, limit: LIMITE, offset: 0, resumen: {} }); setError(''); })
      .catch(err => setError(err.response?.data?.message || 'No se pudieron cargar las solicitudes de aprendices'));
  }
  useEffect(cargar, [offset, estado]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setOffset(0); }, [estado]);

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <strong>🎓 Solicitudes de nuevos aprendices {meta.resumen?.Pendiente ? <span className="badge badge-amber" style={{ marginLeft: 6 }}>{meta.resumen.Pendiente} pendiente(s)</span> : null}</strong>
        <select className="form-select" style={{ maxWidth: 180 }} value={estado} onChange={e => setEstado(e.target.value)} aria-label="Estado de las solicitudes de aprendices">
          <option value="Pendiente">Pendientes</option>
          <option value="Aprobada">Aprobadas</option>
          <option value="Rechazada">Rechazadas</option>
          <option value="">Todas</option>
        </select>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {ok && <div className="alert alert-success" role="status">{ok}</div>}
        {!error && filas.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: 0 }}>
            {estado === 'Pendiente' ? 'No hay solicitudes de aprendices por revisar.' : 'No hay solicitudes con este estado.'}
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Aprendiz</th><th>Identificación</th><th>Ficha / programa</th><th>Proyecto</th><th>Solicita</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {filas.map(s => (
                  <tr key={s.id_solicitud_aprendiz}>
                    <td><div style={{ fontWeight: 600, fontSize: 13 }}>{s.nombres} {s.apellidos}</div><div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{s.correo}</div></td>
                    <td style={{ fontSize: 12 }}>{s.identificacion}</td>
                    <td style={{ fontSize: 12 }}>{s.ficha}<div style={{ color: 'var(--slate-500)' }}>{s.programa_formacion}</div></td>
                    <td style={{ fontSize: 12 }}>{s.proyecto_nombre || '—'}</td>
                    <td style={{ fontSize: 12 }}>{s.instructor_nombre}<div style={{ color: 'var(--slate-500)' }}>{fecha(s.fecha_solicitud)}</div></td>
                    <td>{estadoBadge(s.estado)}</td>
                    <td>
                      {s.estado === 'Pendiente' ? (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setOk(''); setAccion({ estado: 'Aprobada', solicitud: s }); }}>Aprobar</button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => { setOk(''); setAccion({ estado: 'Rechazada', solicitud: s }); }}>Rechazar</button>
                        </div>
                      ) : <span style={{ fontSize: 11, color: 'var(--slate-500)' }}>{s.admin_nombre ? `Por ${s.admin_nombre}` : ''}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination total={meta.total} limit={meta.limit} offset={meta.offset} onChange={setOffset} />
      </div>
      {accion && (
        <ModalResolverAprendiz accion={accion} onClose={() => setAccion(null)}
          onHecho={(mensaje) => { setAccion(null); setOk(mensaje); cargar(); }} />
      )}
    </div>
  );
}
