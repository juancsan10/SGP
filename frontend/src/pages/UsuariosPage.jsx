// =====================================================
// pages/UsuariosPage.jsx
// Gestión de usuarios (solo Admin/Instructor)
// =====================================================
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { usuariosService, authService } from '../services/api.js';
import { LoadingCenter, EmptyState, formatFecha } from '../components/helpers.jsx';

export default function UsuariosPage() {
  const { esAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filtro,   setFiltro]   = useState('');
  const [rolFiltro,setRolFiltro]= useState('');

  // Modal Editar
  const [modalEdit, setModalEdit] = useState(false);
  const [usuSel,    setUsuSel]    = useState(null);
  const [formEdit,  setFormEdit]  = useState({ nombres:'', apellidos:'', ficha:'', programa_formacion:'', id_rol: 3, estado: 1, contrasena:'' });

  // Modal Crear
  const [modalCrear, setModalCrear] = useState(false);
  const [formCrear,  setFormCrear]  = useState({ nombres:'', apellidos:'', correo:'', contrasena:'', id_rol: 3, ficha:'', programa_formacion:'' });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [ok,     setOk]     = useState('');

  const rolIdMap = { Administrador: 1, Instructor: 2, Aprendiz: 3 };

  async function cargar() {
    setLoading(true);
    try {
      const r = await usuariosService.getAll();
      setUsuarios(r.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, []);

  function abrirCrear() {
    setFormCrear({ nombres:'', apellidos:'', correo:'', contrasena:'', id_rol: 3, ficha:'', programa_formacion:'' });
    setError(''); setOk('');
    setModalCrear(true);
  }

  async function guardarCrear(e) {
    e.preventDefault(); setSaving(true); setError(''); setOk('');
    try {
      if (Number(formCrear.id_rol) === 3) {
        await authService.register(formCrear);
      } else {
        await usuariosService.create(formCrear);
      }
      setOk('Usuario creado exitosamente');
      await cargar();
      setTimeout(() => setModalCrear(false), 900);
    } catch (err) { setError(err.response?.data?.message || 'Error al crear usuario'); }
    finally { setSaving(false); }
  }

  function abrirEditar(u) {
    setUsuSel(u);
    setFormEdit({
      nombres: u.nombres,
      apellidos: u.apellidos,
      ficha: u.ficha || '',
      programa_formacion: u.programa_formacion || '',
      id_rol: rolIdMap[u.rol] || 3,
      estado: u.estado ? 1 : 0,
      contrasena: ''
    });
    setError(''); setOk('');
    setModalEdit(true);
  }

  async function guardarEdicion(e) {
    e.preventDefault(); setSaving(true); setError(''); setOk('');
    try {
      await usuariosService.update(usuSel.id_usuario, formEdit);
      setOk('Usuario actualizado correctamente');
      await cargar();
      setTimeout(() => setModalEdit(false), 900);
    } catch (err) { setError(err.response?.data?.message || 'Error al actualizar'); }
    finally { setSaving(false); }
  }

  async function desactivar(id) {
    if (!confirm('¿Desactivar este usuario?')) return;
    try {
      await usuariosService.remove(id);
      await cargar();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  }

  async function activar(u) {
    try {
      await usuariosService.update(u.id_usuario, { estado: 1 });
      await cargar();
    } catch (err) { alert(err.response?.data?.message || 'Error al activar'); }
  }

  const rolBadge = (rol) => {
    const cls = { Administrador:'badge-red', Instructor:'badge-blue', Aprendiz:'badge-green' }[rol] || 'badge-slate';
    return <span className={`badge ${cls}`}>{rol}</span>;
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const txt = `${u.nombres} ${u.apellidos} ${u.correo}`.toLowerCase();
    return txt.includes(filtro.toLowerCase()) && (!rolFiltro || u.rol === rolFiltro);
  });

  if (loading) return (
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
          <p className="page-subtitle">{usuariosFiltrados.length} de {usuarios.length} usuarios</p>
        </div>
        {esAdmin && (
          <button className="btn btn-primary" onClick={abrirCrear}>
            + Nuevo usuario
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Filtros */}
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <input
            className="form-input" style={{ maxWidth:300 }}
            placeholder="🔍  Buscar por nombre o correo…"
            value={filtro} onChange={e=>setFiltro(e.target.value)}
          />
          <select className="form-select" style={{ maxWidth:180 }} value={rolFiltro} onChange={e=>setRolFiltro(e.target.value)}>
            <option value="">Todos los roles</option>
            {['Administrador','Instructor','Aprendiz'].map(r=>(
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {usuariosFiltrados.length === 0 ? (
          <EmptyState icon="👥" titulo="Sin usuarios" />
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Usuario</th><th>Correo</th><th>Rol</th>
                    <th>Ficha</th><th>Programa</th><th>Estado</th>
                    <th>Registro</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map(u => (
                    <tr key={u.id_usuario}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--green-100)', color:'var(--green-600)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>
                            {(u.nombres[0] || '').toUpperCase()}{(u.apellidos[0] || '').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight:600, fontSize:13 }}>{u.nombres} {u.apellidos}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize:12 }}>{u.correo}</td>
                      <td>{rolBadge(u.rol)}</td>
                      <td>{u.ficha || '—'}</td>
                      <td>{u.programa_formacion || '—'}</td>
                      <td>
                        <span className={`badge ${u.estado ? 'badge-green' : 'badge-red'}`}>
                          {u.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ fontSize:11, color:'var(--slate-500)' }}>{formatFecha(u.fecha_registro)}</td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => abrirEditar(u)}>
                            ✏️ Editar
                          </button>
                          {u.estado === 1 ? (
                            <button className="btn btn-danger btn-sm" onClick={() => desactivar(u.id_usuario)}>
                              Desactivar
                            </button>
                          ) : (
                            <button className="btn btn-primary btn-sm" onClick={() => activar(u)}>
                              Activar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear usuario */}
      {modalCrear && (
        <div className="modal-overlay" onClick={() => setModalCrear(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nuevo usuario</span>
              <button className="modal-close" onClick={() => setModalCrear(false)}>×</button>
            </div>
            <form onSubmit={guardarCrear}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                {ok    && <div className="alert alert-success">{ok}</div>}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Nombres *</label>
                    <input className="form-input" value={formCrear.nombres}
                      onChange={e=>setFormCrear({...formCrear,nombres:e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apellidos *</label>
                    <input className="form-input" value={formCrear.apellidos}
                      onChange={e=>setFormCrear({...formCrear,apellidos:e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Correo electrónico *</label>
                  <input className="form-input" type="email" value={formCrear.correo}
                    onChange={e=>setFormCrear({...formCrear,correo:e.target.value})} required />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Contraseña *</label>
                    <input className="form-input" type="password" placeholder="Mínimo 8 caracteres" value={formCrear.contrasena}
                      onChange={e=>setFormCrear({...formCrear,contrasena:e.target.value})} required minLength={8} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rol *</label>
                    <select className="form-select" value={formCrear.id_rol}
                      onChange={e=>setFormCrear({...formCrear,id_rol:Number(e.target.value)})}>
                      <option value={3}>Aprendiz</option>
                      <option value={2}>Instructor</option>
                      <option value={1}>Administrador</option>
                    </select>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Ficha</label>
                    <input className="form-input" placeholder="Ej: 2758401" value={formCrear.ficha}
                      onChange={e=>setFormCrear({...formCrear,ficha:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Programa</label>
                    <input className="form-input" placeholder="Ej: ADSO" value={formCrear.programa_formacion}
                      onChange={e=>setFormCrear({...formCrear,programa_formacion:e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalCrear(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creando…' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar usuario */}
      {modalEdit && (
        <div className="modal-overlay" onClick={() => setModalEdit(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Editar usuario</span>
              <button className="modal-close" onClick={() => setModalEdit(false)}>×</button>
            </div>
            <form onSubmit={guardarEdicion}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                {ok    && <div className="alert alert-success">{ok}</div>}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Nombres</label>
                    <input className="form-input" value={formEdit.nombres}
                      onChange={e=>setFormEdit({...formEdit,nombres:e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apellidos</label>
                    <input className="form-input" value={formEdit.apellidos}
                      onChange={e=>setFormEdit({...formEdit,apellidos:e.target.value})} required />
                  </div>
                </div>
                {esAdmin && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div className="form-group">
                      <label className="form-label">Rol</label>
                      <select className="form-select" value={formEdit.id_rol}
                        onChange={e=>setFormEdit({...formEdit,id_rol:Number(e.target.value)})}>
                        <option value={3}>Aprendiz</option>
                        <option value={2}>Instructor</option>
                        <option value={1}>Administrador</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estado</label>
                      <select className="form-select" value={formEdit.estado}
                        onChange={e=>setFormEdit({...formEdit,estado:Number(e.target.value)})}>
                        <option value={1}>Activo</option>
                        <option value={0}>Inactivo</option>
                      </select>
                    </div>
                  </div>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Ficha</label>
                    <input className="form-input" value={formEdit.ficha}
                      onChange={e=>setFormEdit({...formEdit,ficha:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Programa</label>
                    <input className="form-input" value={formEdit.programa_formacion}
                      onChange={e=>setFormEdit({...formEdit,programa_formacion:e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Nueva contraseña (opcional)</label>
                  <input className="form-input" type="password" placeholder="Dejar vacío para no cambiar"
                    value={formEdit.contrasena}
                    onChange={e=>setFormEdit({...formEdit,contrasena:e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalEdit(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
