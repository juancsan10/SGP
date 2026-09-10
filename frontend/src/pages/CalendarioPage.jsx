// =====================================================
// pages/CalendarioPage.jsx
// Calendario de actividades por proyecto
// =====================================================
import { useEffect, useState } from 'react';
import { agendaService, proyectosService } from '../services/api.js';
import { EmptyState, formatFecha } from '../components/helpers.jsx';

export default function CalendarioPage() {
  const [projects, setProjects] = useState([]);
  const [pid,      setPid]      = useState('');
  const [events,   setEvents]   = useState([]);

  useEffect(() => {
    proyectosService.getAll().then(r => setProjects(r.data.data || []));
  }, []);

  useEffect(() => {
    if (pid) {
      agendaService.calendar(pid).then(r => setEvents(r.data.data || []));
    } else {
      setEvents([]);
    }
  }, [pid]);

  const tipoBadgeCls = {
    tarea:      'badge-amber',
    entregable: 'badge-green',
    reunion:    'badge-blue',
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Calendario de actividades</h1>
          <p className="page-subtitle">Fechas de tareas, entregables y reuniones por proyecto</p>
        </div>
        <select
          className="form-select"
          style={{ maxWidth: 300 }}
          value={pid}
          onChange={e => setPid(e.target.value)}
        >
          <option value="">Selecciona un proyecto…</option>
          {projects.map(p => (
            <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre}</option>
          ))}
        </select>
      </div>

      <div className="page-body">
        {!pid ? (
          <EmptyState icon="🗓️" titulo="Selecciona un proyecto" desc="Elige un proyecto para visualizar su calendario de actividades." />
        ) : events.length === 0 ? (
          <EmptyState icon="📭" titulo="Sin actividades" desc="No hay eventos programados en este proyecto." />
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Actividad</th>
                    <th>Inicio / Fecha</th>
                    <th>Fin / Vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {events.sort((a, b) => String(a.start).localeCompare(String(b.start))).map(e => (
                    <tr key={`${e.type}-${e.id}`}>
                      <td>
                        <span className={`badge ${tipoBadgeCls[e.type] || 'badge-slate'}`}>
                          {e.type}
                        </span>
                      </td>
                      <td><strong>{e.title}</strong></td>
                      <td>{e.start ? formatFecha(e.start) : '—'}</td>
                      <td>{e.end ? formatFecha(e.end) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
