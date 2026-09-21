// =====================================================
// pages/UsuariosPage.jsx
// Gestión de usuarios (Admin/Instructor)
// =====================================================
import { useState, useEffect } from 'react';
import { usuariosService, authService, passwordService } from '../services/api.js';
import { LoadingCenter, EmptyState, formatFecha, Pagination, ConfirmModal } from '../components/helpers.jsx';

const LIMITE = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validarNombre = (v) => v.trim().length >= 2 && v.trim().length <= 100;
const validarCorreo = (v) => EMAIL_REGEX.test(v.trim());
const validarPassword = (v) => v.length >= 8 && /[A-Za-z]/.test(v) && /[0-9]/.test(v);

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit: LIMITE, offset: 0 });
  const [loading, setLoading] = useState(true);

  // ── Filtros (NUEVO: por sección, servidor) ──────────
  const [q, setQ] = useState('');
  const [rolFiltro, setRolFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [offset, setOffset] = useState(0);

  // ── Buscador por cédula ampliado a cualquier rol ────
  const [identificacion, setIdentificacion] = useState('');
  const [rolBusqueda, setRolBusqueda] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [busquedaError, setBusquedaError] = useState('');

  // ── Modal editar ─────────────────────────────────────
  const [modal, setModal] = useState(false);
  const [usuSel, setUsuSel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [form, setForm] = useState({ nombres: '', apellidos: '', ficha: '', programa_formacion: '' });
  const [enviandoReset, setEnviandoReset] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  // ── Modal crear (Instructor/Administrador) ──────────
  const [modalCrear, setModalCrear] = useState(false);
  const [formCrear, setFormCrear] = useState({ nombres: '', apellidos: '', correo: '', identificacion: '', contrasena: '', id_rol: '2', ficha: '', programa_formacion: '' });
  const [erroresCrear, setErroresCrear] = useState({});
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');

  // ── Aviso de activar/desactivar/eliminar (NUEVO: modal con ícono en
  //    vez del confirm() nativo del navegador) ────────
  const [confirmAccion, setConfirmAccion] = useState(null); // { tipo, usuario }
  const [procesando, setProcesando] = useState(false);
  const [accionMsg, setAccionMsg] = useState('');

  async function cargar() {
    setLoading(true);
    try {
      const params = { limit: LIMITE, offset };
      if (q) params.q = q;
      if (rolFiltro) params.rol = rolFiltro;
      if (estadoFiltro !== '') params.estado = estadoFiltro;
      const r = await usuariosService.getAll(params);
      setUsuarios(r.data.data || []);
      setMeta(r.data.meta || { total: 0, limit: LIMITE, offset: 0 });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, [offset, rolFiltro, estadoFiltro]); // eslint-disable-line
  // Al cambiar el texto de búsqueda o los filtros, siempre volver a la página 1.
  useEffect(() => { setOffset(0); }, [q, rolFiltro, estadoFiltro]);
  useEffect(() => {
    const t = setTimeout(() => { if (offset === 0) cargar(); }, 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line

  // ── Buscador por identificación (cualquier rol) ─────
  async function buscar(e) {
    e.preventDefault(); setBuscando(true); setBusquedaError(''); setUsuarioEncontrado(null);
    try {
      const r = await usuariosService.buscarPorIdentificacion(identificacion.trim(), rolBusqueda || undefined);
      setUsuarioEncontrado(r.data.data);
    } catch (err) { setBusquedaError(err.response?.data?.message || 'No se encontró el usuario'); }
    finally { setBuscando(false); }
  }

  function abrirEditar(u) {
    setUsuSel(u);
    setForm({ nombres: u.nombres, apellidos: u.apellidos, ficha: u.ficha || '', programa_formacion: u.programa_formacion || '' });
    setError(''); setOk(''); setResetMsg('');
    setModal(true);
  }

  async function guardarEdicion(e) {
    e.preventDefault(); setSaving(true); setError(''); setOk('');
    if (!validarNombre(form.nombres) || !validarNombre(form.apellidos)) {
      setError('Nombres y apellidos deben tener entre 2 y 100 caracteres');
      setSaving(false);
      return;
    }
    try {
      await usuariosService.update(usuSel.id_usuario, form);
      setOk('Usuario actualizado');
      await cargar();
      setTimeout(() => setModal(false), 900);
    } catch (err) { setError(err.response?.data?.message || 'Error al actualizar'); }
    finally { setSaving(false); }
  }

  async function enviarEnlaceReset() {
    setEnviandoReset(true); setResetMsg('');
    try {
      const r = await passwordService.request(usuSel.correo);
      const url = r.data?.data?.reset_url;
      setResetMsg(url ? `Enlace generado: ${url}` : 'Se generó el enlace de recuperación');
    } catch (err) {
      setResetMsg(err.response?.data?.message || 'No se pudo generar el enlace');
    } finally {
      setEnviandoReset(false);
    }
  }

  // ── Activar / Desactivar / Eliminar permanente (NUEVO: con modal de
  //    confirmación mejorado, en vez del confirm() nativo) ───────────
  function pedirConfirmacion(tipo, usuario) {
    setAccionMsg('');
    setConfirmAccion({ tipo, usuario });
  }

  async function ejecutarAccion() {
    if (!confirmAccion) return;
    const { tipo, usuario } = confirmAccion;
    setProcesando(true);
    try {
      if (tipo === 'desactivar') await usuariosService.remove(usuario.id_usuario);
      if (tipo === 'activar') await usuariosService.activar(usuario.id_usuario);
      if (tipo === 'eliminar') await usuariosService.eliminarPermanente(usuario.id_usuario);
      setConfirmAccion(null);
      await cargar();
    } catch (err) {
      setAccionMsg(err.response?.data?.message || 'No se pudo completar la acción');
    } finally {
      setProcesando(false);
    }
  }

  // ── Crear usuario (Instructor/Administrador) ────────
  function validarFormCrear() {
    const errs = {};
    if (!validarNombre(formCrear.nombres)) errs.nombres = 'Debe tener entre 2 y 100 caracteres';
    if (!validarNombre(formCrear.apellidos)) errs.apellidos = 'Debe tener entre 2 y 100 caracteres';
    if (!validarCorreo(formCrear.correo)) errs.correo = 'Correo electrónico no válido';
    if (!validarPassword(formCrear.contrasena)) errs.contrasena = 'Mínimo 8 caracteres, con al menos una letra y un número';
    setErroresCrear(errs);
    return Object.keys(errs).length === 0;
  }

  async function crearUsuario(e) {
    e.preventDefault(); setErrorCrear('');
    if (!validarFormCrear()) return;
    setCreando(true);
    try {
      await authService.createUser(formCrear);
      setModalCrear(false);
      setFormCrear({ nombres: '', apellidos: '', correo: '', identificacion: '', contrasena: '', id_rol: '2', ficha: '', programa_formacion: '' });
      setErroresCrear({});
      await cargar();
    } catch (err) {
      setErrorCrear(err.response?.data?.message || 'Error al crear el usuario');
    } finally {
      setCreando(false);
    }
  }

  const rolBadge = (rol) => {
    const cls = { Administrador: 'badge-red', Instructor: 'badge-blue', Aprendiz: 'badge-green' }[rol] || 'badge-slate';
    return <span className={`badge ${cls}`}>{rol}</span>;
  };

  const textosConfirmacion = {
    desactivar: {
      tipo: 'advertencia',
      titulo: '¿Desactivar este usuario?',
      mensaje: (u) => `${u.nombres} ${u.apellidos} no podrá iniciar sesión hasta que lo reactives. Sus datos y su historial se conservan intactos.`,
      texto: 'Sí, desactivar',
    },
    activar: {
      tipo: 'info',
      titulo: '¿Reactivar este usuario?',
      mensaje: (u) => `${u.nombres} ${u.apellidos} podrá volver a iniciar sesión de inmediato.`,
      texto: 'Sí, activar',
    },
    eliminar: {
      tipo: 'peligro',
      titulo: '¿Eliminar este usuario permanentemente?',
      mensaje: (u) => `Esta acción NO se puede deshacer. Si ${u.nombres} tiene proyectos, tareas o equipos asociados, el sistema rechazará la eliminación y deberás desactivarlo en su lugar.`,
      texto: 'Sí, eliminar',
    },
  };

  if (loading && usuarios.length === 0) return (
    <div>
      <div className="page-header"><div className="page-header-left"><h1 className="page-title">Usuarios</h1></div></div>
      <LoadingCenter />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">{meta.total} usuario(s) registrados</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={() => { setErrorCrear(''); setErroresCrear({}); setModalCrear(true); }}>
            + Nuevo usuario
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Buscador por cédula — ahora cualquier rol */}
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--role-primary, var(--green-600))' }}>
          <div className="card-body">
            <div style={{ fontWeight: 700, marginBottom: 4 }}>🔎 Buscar por identificación (cc)</div>
            <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 12 }}>
              Busca aprendices, instructores o administradores por su número de identificación.
            </div>
            <form onSubmit={buscar} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input className="form-input" style={{ maxWidth: 260 }} placeholder="Ej. 1098765001"
                value={identificacion} onChange={e => setIdentificacion(e.target.value.replace(/[^A-Za-z0-9.-]/g, ''))} />
              <select className="form-select" style={{ maxWidth: 180 }} value={rolBusqueda} onChange={e => setRolBusqueda(e.target.value)}>
                <option value="">Cualquier rol</option>
                <option value="Aprendiz">Aprendiz</option>
                <option value="Instructor">Instructor</option>
                <option value="Administrador">Administrador</option>
              </select>
              <button className="btn btn-primary" disabled={buscando || identificacion.length < 4}>
                {buscando ? 'Buscando…' : 'Buscar'}
              </button>
            </form>
            {busquedaError && <div className="alert alert-error" style={{ marginTop: 12 }}>{busquedaError}</div>}
            {usuarioEncontrado && (
              <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: 'var(--role-bg, var(--slate-50))', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
                <div><strong>{usuarioEncontrado.nombres} {usuarioEncontrado.apellidos}</strong></div>
                <div>{rolBadge(usuarioEncontrado.rol)}</div>
                <div>Identificación: <strong>{usuarioEncontrado.identificacion}</strong></div>
                <div>Correo: {usuarioEncontrado.correo}</div>
                <div>Estado: {usuarioEncontrado.estado ? 'Activo' : 'Inactivo'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Filtros por sección (NUEVO) */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            className="form-input" style={{ maxWidth: 300 }}
            placeholder="🔍  Buscar por nombre, cc o correo…"
            value={q} onChange={e => setQ(e.target.value)}
          />
          <select className="form-select" style={{ maxWidth: 180 }} value={rolFiltro} onChange={e => setRolFiltro(e.target.value)}>
            <option value="">Todos los roles</option>
            {['Administrador', 'Instructor', 'Aprendiz'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select className="form-select" style={{ maxWidth: 160 }} value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
            <option value="">Cualquier estado</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        {usuarios.length === 0 ? (
          <EmptyState icon="👥" titulo="Sin usuarios" desc="No hay usuarios que coincidan con los filtros." />
        ) : (
          <>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Usuario</th><th>Identificación</th><th>Correo</th><th>Rol</th>
                      <th>Ficha</th><th>Programa</th><th>Estado</th>
                      <th>Registro</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map(u => (
                      <tr key={u.id_usuario}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-100)', color: 'var(--green-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                              {u.nombres[0]}{u.apellidos[0]}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.nombres} {u.apellidos}</div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>{u.identificacion || '—'}</td>
                        <td style={{ fontSize: 12 }}>{u.correo}</td>
                        <td>{rolBadge(u.rol)}</td>
                        <td>{u.ficha || '—'}</td>
                        <td>{u.programa_formacion || '—'}</td>
                        <td>
                          <span className={`badge ${u.estado ? 'badge-green' : 'badge-red'}`}>
                            {u.estado ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--slate-500)' }}>{formatFecha(u.fecha_registro)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => abrirEditar(u)}>✏️ Editar</button>
                            {u.estado === 1 ? (
                              <button className="btn btn-secondary btn-sm" onClick={() => pedirConfirmacion('desactivar', u)}>⏸️ Desactivar</button>
                            ) : (
                              <button className="btn btn-secondary btn-sm" onClick={() => pedirConfirmacion('activar', u)}>▶️ Activar</button>
                            )}
                            <button className="btn btn-danger btn-sm" onClick={() => pedirConfirmacion('eliminar', u)}>🗑️ Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginación numerada (NUEVO) */}
            <Pagination total={meta.total} limit={meta.limit} offset={meta.offset} onChange={setOffset} />
          </>
        )}
      </div>

      {/* Modal editar usuario */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Editar usuario</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={guardarEdicion}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                {ok && <div className="alert alert-success">{ok}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Nombres</label>
                    <input className="form-input" value={form.nombres}
                      onChange={e => setForm({ ...form, nombres: e.target.value })} required minLength={2} maxLength={100} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apellidos</label>
                    <input className="form-input" value={form.apellidos}
                      onChange={e => setForm({ ...form, apellidos: e.target.value })} required minLength={2} maxLength={100} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Ficha</label>
                    <input className="form-input" value={form.ficha}
                      onChange={e => setForm({ ...form, ficha: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Programa</label>
                    <input className="form-input" value={form.programa_formacion}
                      onChange={e => setForm({ ...form, programa_formacion: e.target.value })} />
                  </div>
                </div>

                <div className="form-group" style={{ borderTop: '1px solid var(--slate-200)', paddingTop: 12, marginTop: 4 }}>
                  <label className="form-label">Restablecer contraseña</label>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 8 }}>
                    Genera un enlace de recuperación de un solo uso para que {usuSel?.nombres} defina una nueva contraseña.
                  </p>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={enviandoReset} onClick={enviarEnlaceReset}>
                    {enviandoReset ? 'Generando…' : '🔑 Generar enlace de recuperación'}
                  </button>
                  {resetMsg && <p style={{ fontSize: 11, color: 'var(--slate-600)', marginTop: 6, wordBreak: 'break-all' }}>{resetMsg}</p>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal crear usuario */}
      {modalCrear && (
        <div className="modal-overlay" onClick={() => setModalCrear(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nuevo usuario (Instructor o Administrador)</span>
              <button className="modal-close" onClick={() => setModalCrear(false)}>×</button>
            </div>
            <form onSubmit={crearUsuario}>
              <div className="modal-body">
                {errorCrear && <div className="alert alert-error">{errorCrear}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Nombres *</label>
                    <input className={`form-input ${erroresCrear.nombres ? 'input-error' : ''}`}
                      value={formCrear.nombres}
                      onChange={e => setFormCrear({ ...formCrear, nombres: e.target.value })} required />
                    {erroresCrear.nombres && <span className="field-error">{erroresCrear.nombres}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apellidos *</label>
                    <input className={`form-input ${erroresCrear.apellidos ? 'input-error' : ''}`}
                      value={formCrear.apellidos}
                      onChange={e => setFormCrear({ ...formCrear, apellidos: e.target.value })} required />
                    {erroresCrear.apellidos && <span className="field-error">{erroresCrear.apellidos}</span>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Correo electrónico *</label>
                    <input className={`form-input ${erroresCrear.correo ? 'input-error' : ''}`} type="email"
                      placeholder="nombre@sena.edu.co"
                      value={formCrear.correo}
                      onChange={e => setFormCrear({ ...formCrear, correo: e.target.value })} required />
                    {erroresCrear.correo && <span className="field-error">{erroresCrear.correo}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Identificación (cc)</label>
                    <input className="form-input" value={formCrear.identificacion}
                      onChange={e => setFormCrear({ ...formCrear, identificacion: e.target.value.replace(/[^A-Za-z0-9.-]/g, '') })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Contraseña temporal *</label>
                    <input className={`form-input ${erroresCrear.contrasena ? 'input-error' : ''}`} type="password"
                      value={formCrear.contrasena}
                      onChange={e => setFormCrear({ ...formCrear, contrasena: e.target.value })} required />
                    {erroresCrear.contrasena
                      ? <span className="field-error">{erroresCrear.contrasena}</span>
                      : <span style={{ fontSize: 11, color: 'var(--slate-500)' }}>Mínimo 8 caracteres, con letra y número</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rol *</label>
                    <select className="form-select" value={formCrear.id_rol}
                      onChange={e => setFormCrear({ ...formCrear, id_rol: e.target.value })}>
                      <option value="2">Instructor</option>
                      <option value="1">Administrador</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Ficha (opcional)</label>
                    <input className="form-input" value={formCrear.ficha}
                      onChange={e => setFormCrear({ ...formCrear, ficha: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Programa (opcional)</label>
                    <input className="form-input" value={formCrear.programa_formacion}
                      onChange={e => setFormCrear({ ...formCrear, programa_formacion: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalCrear(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={creando}>
                  {creando ? 'Creando…' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Aviso de activar/desactivar/eliminar (NUEVO, con ícono y botones diferenciados) */}
      {confirmAccion && (
        <ConfirmModal
          abierto
          tipo={textosConfirmacion[confirmAccion.tipo].tipo}
          titulo={textosConfirmacion[confirmAccion.tipo].titulo}
          mensaje={
            accionMsg
              ? accionMsg
              : textosConfirmacion[confirmAccion.tipo].mensaje(confirmAccion.usuario)
          }
          textoConfirmar={textosConfirmacion[confirmAccion.tipo].texto}
          cargando={procesando}
          onConfirmar={ejecutarAccion}
          onCancelar={() => { setConfirmAccion(null); setAccionMsg(''); }}
        />
      )}
    </div>
  );
}
