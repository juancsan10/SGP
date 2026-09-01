// =====================================================
// pages/ProyectosPage.jsx
// Listado de proyectos con modal de creación
// =====================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { proyectosService, usuariosService } from '../services/api.js';
import { estadoBadge, ProgressBar, LoadingCenter, EmptyState, formatFecha } from '../components/helpers.jsx';

export default function ProyectosPage() {
  const { esAdmin, esInstructor, usuario } = useAuth();
  const navigate = useNavigate();

  const [proyectos,   setProyectos]   = useState([]);
  const [instructores,setInstructores]= useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [form,        setForm]        = useState({ nombre:'', descripcion:'', fecha_inicio:'', fecha_fin:'', id_instructor:'' });
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [filtro,      setFiltro]      = useState('');

  async function cargar() {
    setLoading(true);
    try {
      const [pRes, uRes] = await Promise.all([
        proyectosService.getAll(),
        usuariosService.getAll(),
      ]);
      setProyectos(pRes.data.data || []);
      setInstructores((uRes.data.data || []).filter(u =>
        u.rol === 'Instructor' || u.rol === 'Administrador'
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function abrirModal() {
    setForm({
      nombre:'', descripcion:'', fecha_inicio:'', fecha_fin:'',
      id_instructor: (esInstructor && !esAdmin) ? String(usuario.id) : '',
    });
    setError('');
    setModal(true);
  }

  async function handleCrear(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await proyectosService.create(form);
      setModal(false);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear proyecto');
    } finally {
      setSaving(false);
    }
  }

  const proyectosFiltrados = proyectos.filter(p =>
    p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    (p.instructor || '').toLowerCase().includes(filtro.toLowerCase())
  );

  if (loading) return <><PageHeader /><LoadingCenter /></>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Proyectos</h1>
          <p className="page-subtitle">{proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''} registrado{proyectos.length !== 1 ? 's' : ''}</p>
        </div>
        {(esAdmin || esInstructor) && (
          <button className="btn btn-primary" onClick={abrirModal}>+ Nuevo proyecto</button>
        )}
      </div>

      <div className="page-body">
        {/* Filtro */}
        <div style={{ marginBottom: 20 }}>
          <input
            className="form-input"
            placeholder="🔍  Buscar por nombre o instructor…"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            style={{ maxWidth: 360 }}
          />
        </div>

        {proyectosFiltrados.length === 0 ? (
          <EmptyState
            icon="📁" titulo="Sin proyectos"
            desc="Crea el primer proyecto para comenzar."
            accion={(esAdmin || esInstructor) && (
              <button className="btn btn-primary" onClick={abrirModal}>+ Crear proyecto</button>
            )}
          />
        ) : (
          <div className="projects-grid">
            {proyectosFiltrados.map(p => (
              <div key={p.id_proyecto} className="project-card">
                <div className="project-card-header">
                  <div>
                    <div className="project-card-title">{p.nombre}</div>
                    <div className="project-card-desc">{p.descripcion || 'Sin descripción'}</div>
                  </div>
                  {estadoBadge(p.estado)}
                </div>
                <div className="project-card-meta">
                  <ProgressBar value={parseFloat(p.porcentaje_avance) || 0} />
                </div>
                <div className="project-card-footer">
                  <div className="project-card-instructor">
                    👤 {p.instructor} · 📅 {formatFecha(p.fecha_inicio)}
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/proyectos/${p.id_proyecto}`)}
                  >
                    Ver detalles →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear proyecto */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nuevo proyecto</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleCrear}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}

                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" value={form.nombre}
                    onChange={e => setForm({...form, nombre: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea className="form-textarea" value={form.descripcion}
                    onChange={e => setForm({...form, descripcion: e.target.value})} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Fecha inicio *</label>
                    <input className="form-input" type="date" value={form.fecha_inicio}
                      onChange={e => setForm({...form, fecha_inicio: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha fin</label>
                    <input className="form-input" type="date" value={form.fecha_fin}
                      onChange={e => setForm({...form, fecha_fin: e.target.value})} />
                  </div>
                </div>
                {(esAdmin) && (
                  <div className="form-group">
                    <label className="form-label">Instructor *</label>
                    <select className="form-select" value={form.id_instructor}
                      onChange={e => setForm({...form, id_instructor: e.target.value})} required>
                      <option value="">Seleccionar instructor</option>
                      {instructores.map(u => (
                        <option key={u.id_usuario} value={u.id_usuario}>
                          {u.nombres} {u.apellidos}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creando…' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1 className="page-title">Proyectos</h1>
      </div>
    </div>
  );
}
