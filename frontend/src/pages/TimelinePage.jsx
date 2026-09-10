// =====================================================
// pages/TimelinePage.jsx
// Línea de tiempo cronológica de cambios por proyecto
// =====================================================
import { useEffect, useState } from 'react';
import { agendaService, proyectosService } from '../services/api.js';
import { EmptyState } from '../components/helpers.jsx';

export default function TimelinePage() {
  const [projects, setProjects] = useState([]);
  const [pid,      setPid]      = useState('');
  const [items,    setItems]    = useState([]);

  useEffect(() => {
    proyectosService.getAll().then(r => setProjects(r.data.data || []));
  }, []);

  useEffect(() => {
    if (pid) {
      agendaService.timeline(pid).then(r => setItems(r.data.data || []));
    } else {
      setItems([]);
    }
  }, [pid]);

  const accionBadgeCls = {
    INSERT: 'badge-green',
    UPDATE: 'badge-blue',
    DELETE: 'badge-red',
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Línea de tiempo</h1>
          <p className="page-subtitle">Historial cronológico de cambios del proyecto</p>
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
          <EmptyState icon="📈" titulo="Selecciona un proyecto" desc="Elige un proyecto para explorar la línea de tiempo de cambios." />
        ) : items.length === 0 ? (
          <EmptyState icon="📭" titulo="Sin cambios registrados" desc="No hay historial reciente para este proyecto." />
        ) : (
          <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map(i => (
              <div
                key={i.id_historial}
                style={{
                  borderLeft: '3px solid var(--green-500)',
                  padding: '10px 16px',
                  background: 'var(--slate-50)',
                  borderRadius: '0 8px 8px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={`badge ${accionBadgeCls[i.accion] || 'badge-slate'}`}>
                    {i.accion}
                  </span>
                  <strong style={{ fontSize: 13, color: 'var(--slate-800)' }}>
                    {i.tabla_afectada} (ID: #{i.id_registro})
                  </strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                  👤 {i.usuario || 'Sistema'} · 📅 {new Date(i.fecha_cambio).toLocaleString('es-CO')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
