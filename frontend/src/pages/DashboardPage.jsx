// =====================================================
// pages/DashboardPage.jsx
// Panel principal con resumen de proyectos y tareas
// =====================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { proyectosService, tareasService, mensajesService } from '../services/api.js';
import { estadoBadge, prioridadBadge, formatFecha } from '../components/helpers.jsx';

export default function DashboardPage() {
  const { usuario } = useAuth();
  const navigate    = useNavigate();

  const [proyectos, setProyectos] = useState([]);
  const [tareas,    setTareas]    = useState([]);
  const [mensajes,  setMensajes]  = useState([]); // NUEVO: mensajes recientes
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        const [pRes] = await Promise.all([proyectosService.getAll()]);
        setProyectos(pRes.data.data || []);

        // CORREGIDO (mismo bug que se encontró en mensajes): antes esto
        // pedía tareas solo de "los primeros 5 proyectos" — una tarea de
        // cualquier otro proyecto quedaba guardada pero invisible aquí.
        // Ahora se pide directo al endpoint dedicado, con el alcance
        // correcto por rol resuelto en el backend.
        const rTareas = await tareasService.getRecientes(8);
        setTareas(rTareas.data.data || []);

        // CORREGIDO: antes esto pedía mensajes solo de "los primeros 5
        // proyectos" — un mensaje creado en cualquier otro proyecto nunca se llegaba a pedir, aunque
        // estuviera perfectamente guardado en la base de datos. Ahora se
        // pide directo al endpoint dedicado, que ya trae los más recientes
        // del alcance correcto según el rol (resuelto en el backend).
        const rMsg = await mensajesService.getRecientes(8);
        setMensajes(rMsg.data.data || []);
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Inicio</h1>
          </div>
        </div>
        <div className="loading-center"><div className="spinner" /><span>Cargando datos…</span></div>
      </div>
    );
  }

  // Estadísticas calculadas
  const activos    = proyectos.filter(p => p.estado === 'Activo').length;
  const planif     = proyectos.filter(p => p.estado === 'En Planificación' || p.estado === 'Planeado').length;
  const finalizados= proyectos.filter(p => p.estado === 'Finalizado').length;
  const tareasPend = tareas.filter(t => t.estado === 'Pendiente').length;

  return (
    <div>
      {/* Cabecera */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Hola, {usuario?.nombres} 👋</h1>
          <p className="page-subtitle">Aquí tienes un resumen de tus proyectos</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/proyectos')}>
          Ver todos los proyectos
        </button>
      </div>

      <div className="page-body">
        {/* Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon green">📁</div>
            <div>
              <div className="stat-value">{proyectos.length}</div>
              <div className="stat-label">Proyectos totales</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">🔄</div>
            <div>
              <div className="stat-value">{activos}</div>
              <div className="stat-label">En curso</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">📝</div>
            <div>
              <div className="stat-value">{planif}</div>
              <div className="stat-label">En planificación</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">🏁</div>
            <div>
              <div className="stat-value">{finalizados}</div>
              <div className="stat-label">Finalizados</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">⏳</div>
            <div>
              <div className="stat-value">{tareasPend}</div>
              <div className="stat-label">Tareas pendientes</div>
            </div>
          </div>
        </div>

        {/* Proyectos recientes */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span>📁</span>
            <strong>Proyectos recientes</strong>
          </div>
          <div>
            {proyectos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <h3>Sin proyectos aún</h3>
                <p>Ve a la sección de Proyectos para crear el primero.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Estado</th>
                      <th>Avance</th>
                      <th>Instructor</th>
                      <th>Inicio</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {proyectos.slice(0, 6).map(p => (
                      <tr key={p.id_proyecto}>
                        <td><strong>{p.nombre}</strong></td>
                        <td>{estadoBadge(p.estado)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                            <div className="progress-wrap" style={{ flex: 1 }}>
                              <div className="progress-bar" style={{ width: `${p.porcentaje_avance || 0}%` }} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--slate-500)', width: 32 }}>
                              {p.porcentaje_avance || 0}%
                            </span>
                          </div>
                        </td>
                        <td>{p.instructor}</td>
                        <td>{formatFecha(p.fecha_inicio)}</td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/proyectos/${p.id_proyecto}`)}
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Tareas recientes */}
        <div className="card">
          <div className="card-header">
            <span>✅</span>
            <strong>Tareas recientes</strong>
          </div>
          {tareas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>Sin tareas registradas</h3>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Asignado a</th>
                    <th>Vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {tareas.slice(0, 8).map(t => (
                    <tr key={t.id_tarea}>
                      <td><strong>{t.titulo}</strong></td>
                      <td>{estadoBadge(t.estado)}</td>
                      <td>{prioridadBadge(t.prioridad)}</td>
                      <td>{t.asignado_nombre}</td>
                      <td>{formatFecha(t.fecha_vencimiento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* NUEVO: Mensajes recientes — así la creación de un mensaje
            (o su edición) se ve reflejada aquí, no solo en la pestaña
            de Mensajes de cada proyecto. */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <span>💬</span>
            <strong>Mensajes recientes</strong>
          </div>
          {mensajes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>Sin mensajes recientes</h3>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mensaje</th>
                    <th>Proyecto</th>
                    <th>De</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {mensajes.slice(0, 8).map(m => (
                    <tr key={m.id_mensaje}>
                      <td>
                        {m.contenido.length > 60 ? m.contenido.substring(0, 60) + '…' : m.contenido}
                        {m.fecha_edicion && <span style={{ fontSize:10, color:'var(--slate-400)' }}> (editado)</span>}
                      </td>
                      <td><span className="badge badge-slate">{m.proyecto_nombre}</span></td>
                      <td>{m.remitente_nombre}</td>
                      <td style={{ fontSize:11, color:'var(--slate-500)' }}>{new Date(m.fecha_envio).toLocaleString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
