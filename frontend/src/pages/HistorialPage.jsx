// =====================================================
// pages/HistorialPage.jsx
// Historial de cambios / auditoría (solo Admin)
// =====================================================
import { useState, useEffect } from 'react';
import { historialService } from '../services/api.js';
import { LoadingCenter, EmptyState } from '../components/helpers.jsx';

const ACCIONES = {
  INSERT: { label: 'Creación',  cls: 'badge-green' },
  UPDATE: { label: 'Edición',   cls: 'badge-blue'  },
  DELETE: { label: 'Eliminación', cls: 'badge-red' },
};

export default function HistorialPage() {
  const [historial, setHistorial] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filtro,    setFiltro]    = useState('');
  const [accion,    setAccion]    = useState('');
  const [tabla,     setTabla]     = useState('');

  useEffect(() => {
    historialService.getAll()
      .then(r => setHistorial(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tablas = [...new Set(historial.map(h => h.tabla_afectada))].sort();

  const filtrado = historial.filter(h => {
    const txt = `${h.tabla_afectada} ${h.usuario_nombre || ''}`.toLowerCase();
    return txt.includes(filtro.toLowerCase())
      && (!accion || h.accion === accion)
      && (!tabla  || h.tabla_afectada === tabla);
  });

  if (loading) return (
    <div>
      <div className="page-header"><div className="page-header-left"><h1 className="page-title">Historial</h1></div></div>
      <LoadingCenter />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Historial de cambios</h1>
          <p className="page-subtitle">Auditoría del sistema · {filtrado.length} registros</p>
        </div>
      </div>

      <div className="page-body">
        {/* Filtros */}
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <input
            className="form-input" style={{ maxWidth:260 }}
            placeholder="🔍  Buscar tabla o usuario…"
            value={filtro} onChange={e=>setFiltro(e.target.value)}
          />
          <select className="form-select" style={{ maxWidth:180 }} value={accion} onChange={e=>setAccion(e.target.value)}>
            <option value="">Todas las acciones</option>
            {Object.keys(ACCIONES).map(a=><option key={a} value={a}>{ACCIONES[a].label}</option>)}
          </select>
          <select className="form-select" style={{ maxWidth:200 }} value={tabla} onChange={e=>setTabla(e.target.value)}>
            <option value="">Todas las tablas</option>
            {tablas.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          {(filtro||accion||tabla) && (
            <button className="btn btn-ghost" onClick={()=>{setFiltro('');setAccion('');setTabla('');}}>
              Limpiar ×
            </button>
          )}
        </div>

        {filtrado.length === 0 ? (
          <EmptyState icon="📋" titulo="Sin registros" desc="No hay cambios que coincidan." />
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Tabla</th><th>Registro</th>
                    <th>Acción</th><th>Usuario</th><th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrado.map(h => {
                    const acc = ACCIONES[h.accion] || { label: h.accion, cls: 'badge-slate' };
                    return (
                      <tr key={h.id_historial}>
                        <td style={{ color:'var(--slate-400)', fontSize:11 }}>#{h.id_historial}</td>
                        <td>
                          <span className="badge badge-slate" style={{ fontFamily:'monospace', fontSize:10 }}>
                            {h.tabla_afectada}
                          </span>
                        </td>
                        <td style={{ fontSize:12 }}>ID: {h.id_registro}</td>
                        <td><span className={`badge ${acc.cls}`}>{acc.label}</span></td>
                        <td style={{ fontSize:13 }}>{h.usuario_nombre || '—'}</td>
                        <td style={{ fontSize:11, color:'var(--slate-500)' }}>
                          {new Date(h.fecha_cambio).toLocaleString('es-CO')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
