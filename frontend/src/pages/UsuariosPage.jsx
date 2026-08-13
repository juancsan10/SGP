// =====================================================
// pages/UsuariosPage.jsx
// Gestión de usuarios (solo Admin/Instructor)
// =====================================================
import { useState, useEffect } from 'react';
import { usuariosService } from '../services/api.js';
import { LoadingCenter, EmptyState, formatFecha } from '../components/helpers.jsx';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filtro,   setFiltro]   = useState('');
  const [rolFiltro,setRolFiltro]= useState('');
  const [modal,    setModal]    = useState(false);
  const [usuSel,   setUsuSel]   = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [ok,       setOk]       = useState('');

  const [form, setForm] = useState({ nombres:'', apellidos:'', ficha:'', programa_formacion:'', contrasena:'' });

  async function cargar() {
    setLoading(true);
    try {
      const r = await usuariosService.getAll();
      setUsuarios(r.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, []);

  function abrirEditar(u) {
    setUsuSel(u);
    setForm({ nombres: u.nombres, apellidos: u.apellidos, ficha: u.ficha || '', programa_formacion: u.programa_formacion || '', contrasena: '' });
    setError(''); setOk('');
    setModal(true);
  }

  async function guardarEdicion(e) {
    e.preventDefault(); setSaving(true); setError(''); setOk('');
    try {
      await usuariosService.update(usuSel.id_usuario, form);
      setOk('Usuario actualizado');
      await cargar();
      setTimeout(() => setModal(false), 900);
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
                            {u.nombres[0]}{u.apellidos[0]}
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
                          {u.estado === 1 && (
                            <button className="btn btn-danger btn-sm" onClick={() => desactivar(u.id_usuario)}>
                              Desactivar
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

      {/* Modal editar usuario */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Editar usuario</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={guardarEdicion}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                {ok    && <div className="alert alert-success">{ok}</div>}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Nombres</label>
                    <input className="form-input" value={form.nombres}
                      onChange={e=>setForm({...form,nombres:e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apellidos</label>
                    <input className="form-input" value={form.apellidos}
                      onChange={e=>setForm({...form,apellidos:e.target.value})} required />
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Ficha</label>
                    <input className="form-input" value={form.ficha}
                      onChange={e=>setForm({...form,ficha:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Programa</label>
                    <input className="form-input" value={form.programa_formacion}
                      onChange={e=>setForm({...form,programa_formacion:e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Nueva contraseña (opcional)</label>
                  <input className="form-input" type="password" placeholder="Dejar vacío para no cambiar"
                    value={form.contrasena}
                    onChange={e=>setForm({...form,contrasena:e.target.value})} />
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
    </div>
  );
}
