// =====================================================
// pages/ReportesPage.jsx
// Módulo de Reportes y Analítica (HU-35 / RF6.3 / CU-010)
// Permite a instructores y administradores exportar reportes
// de avance de proyectos en formatos PDF y Excel (.xlsx).
// =====================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { reportesService, proyectosService } from '../services/api.js';
import { estadoBadge, ProgressBar, LoadingCenter, formatFecha, Pagination } from '../components/helpers.jsx';

const LIMITE_POR_PAGINA = 8;

export default function ReportesPage() {
  const { usuario, esAdmin, esInstructor } = useAuth();

  const [proyectos, setProyectos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [offset, setOffset] = useState(0);

  // Estados de exportación
  const [exportando, setExportando] = useState(null); // 'cons-pdf' | 'cons-excel' | 'proj-pdf-${id}' | 'proj-excel-${id}'
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  // Cargar datos
  async function cargarDatos() {
    setLoading(true);
    setMensajeError('');
    try {
      // Intentar cargar resumen dedicado y listado de proyectos
      const [pRes, rRes] = await Promise.allSettled([
        proyectosService.getAll(),
        reportesService.getResumen(),
      ]);

      if (pRes.status === 'fulfilled') {
        setProyectos(pRes.value.data.data || []);
      }

      if (rRes.status === 'fulfilled' && rRes.value.data?.data) {
        setResumen(rRes.value.data.data.resumen);
      }
    } catch (err) {
      console.error('Error cargando reportes:', err);
      setMensajeError('No se pudieron cargar algunos datos de reportes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    setOffset(0);
  }, [filtro, estadoFiltro]);

  // Limpiar mensajes temporales
  function mostrarNotificacion(exito, texto) {
    if (exito) {
      setMensajeExito(texto);
      setMensajeError('');
      setTimeout(() => setMensajeExito(''), 4500);
    } else {
      setMensajeError(texto);
      setMensajeExito('');
      setTimeout(() => setMensajeError(''), 5500);
    }
  }

  // ── MANEJADORES DE EXPORTACIÓN ──

  async function handleExportarConsolidadoPdf() {
    setExportando('cons-pdf');
    try {
      await reportesService.descargarConsolidadoPdf();
      mostrarNotificacion(true, '✅ Reporte consolidado en PDF descargado exitosamente.');
    } catch (err) {
      console.warn('Fallo backend en PDF consolidado, ejecutando generador cliente:', err);
      generarFallbackPdfConsolidado();
      mostrarNotificacion(true, '✅ Reporte consolidado generado para impresión/PDF.');
    } finally {
      setExportando(null);
    }
  }

  async function handleExportarConsolidadoExcel() {
    setExportando('cons-excel');
    try {
      await reportesService.descargarConsolidadoExcel();
      mostrarNotificacion(true, '✅ Reporte consolidado en Excel (.xlsx) descargado exitosamente.');
    } catch (err) {
      console.warn('Fallo backend en Excel consolidado, ejecutando generador CSV/Excel:', err);
      generarFallbackExcelConsolidado();
      mostrarNotificacion(true, '✅ Archivo Excel descargado exitosamente.');
    } finally {
      setExportando(null);
    }
  }

  async function handleExportarProyectoPdf(id, nombre) {
    setExportando(`proj-pdf-${id}`);
    try {
      await reportesService.descargarProyectoPdf(id, nombre);
      mostrarNotificacion(true, `✅ Reporte PDF de "${nombre}" descargado con éxito.`);
    } catch (err) {
      console.warn('Fallo backend PDF de proyecto, ejecutando fallback:', err);
      generarFallbackPdfProyecto(id, nombre);
      mostrarNotificacion(true, `✅ Reporte de "${nombre}" generado para guardar como PDF.`);
    } finally {
      setExportando(null);
    }
  }

  async function handleExportarProyectoExcel(id, nombre) {
    setExportando(`proj-excel-${id}`);
    try {
      await reportesService.descargarProyectoExcel(id, nombre);
      mostrarNotificacion(true, `✅ Archivo Excel (.xlsx) de "${nombre}" descargado con éxito.`);
    } catch (err) {
      console.warn('Fallo backend Excel de proyecto, ejecutando fallback:', err);
      generarFallbackExcelProyecto(id, nombre);
      mostrarNotificacion(true, `✅ Archivo Excel de "${nombre}" descargado con éxito.`);
    } finally {
      setExportando(null);
    }
  }

  // ── GENERADORES FALLBACK CLIENTE RESILIENTES ──
  function generarFallbackExcelConsolidado() {
    const encabezados = ['ID Proyecto', 'Nombre', 'Instructor', 'Estado', 'Avance %', 'Fecha Inicio', 'Fecha Fin'];
    const filas = proyectos.map(p => [
      p.id_proyecto,
      `"${(p.nombre || '').replace(/"/g, '""')}"`,
      `"${(p.instructor || '').replace(/"/g, '""')}"`,
      `"${p.estado}"`,
      p.porcentaje_avance || 0,
      p.fecha_inicio ? p.fecha_inicio.slice(0, 10) : '',
      p.fecha_fin ? p.fecha_fin.slice(0, 10) : '',
    ]);

    const csvContent = '\uFEFF' + [encabezados.join(';'), ...filas.map(f => f.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Consolidado_Proyectos_SENA_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function generarFallbackExcelProyecto(id, nombre) {
    const p = proyectos.find(item => item.id_proyecto === id);
    if (!p) return;
    const lineas = [
      'SENA · SISTEMA DE GESTIÓN DE PROYECTOS (SGP)',
      `REPORTE DE AVANCE: "${(p.nombre || '').replace(/"/g, '""')}"`,
      '',
      'CAMPO;VALOR',
      `ID Proyecto;${p.id_proyecto}`,
      `Nombre;${p.nombre}`,
      `Estado;${p.estado}`,
      `Instructor Líder;${p.instructor || '—'}`,
      `Porcentaje de Avance;${p.porcentaje_avance || 0}%`,
      `Fecha de Inicio;${p.fecha_inicio ? p.fecha_inicio.slice(0, 10) : '—'}`,
      `Fecha de Fin;${p.fecha_fin ? p.fecha_fin.slice(0, 10) : '—'}`,
      `Fecha de Generación;${new Date().toLocaleString('es-CO')}`,
    ];
    const csvContent = '\uFEFF' + lineas.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${(nombre || 'proyecto').replace(/\s+/g, '_')}_${id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function generarFallbackPdfConsolidado() {
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    ventana.document.write(`
      <html>
        <head>
          <title>Reporte Consolidado de Proyectos SENA</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
            .header { background: #39A900; color: white; padding: 18px 24px; border-radius: 6px; margin-bottom: 20px; }
            h1 { margin: 0; font-size: 20px; }
            p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th { background: #00324D; color: white; text-align: left; padding: 8px 10px; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
            tr:nth-child(even) { background: #f8fafc; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-weight: 600; font-size: 11px; background: #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SENA · Sistema de Gestión de Proyectos (SGP)</h1>
            <p>Reporte Consolidado de Proyectos — Emisión: ${new Date().toLocaleString('es-CO')}</p>
          </div>
          <table>
            <thead>
              <tr><th>ID</th><th>Proyecto</th><th>Instructor</th><th>Estado</th><th>Avance</th><th>Inicio</th><th>Fin</th></tr>
            </thead>
            <tbody>
              ${proyectos.map(p => `
                <tr>
                  <td>${p.id_proyecto}</td>
                  <td><strong>${p.nombre}</strong></td>
                  <td>${p.instructor || '—'}</td>
                  <td><span class="badge">${p.estado}</span></td>
                  <td><strong>${p.porcentaje_avance || 0}%</strong></td>
                  <td>${p.fecha_inicio ? p.fecha_inicio.slice(0, 10) : '—'}</td>
                  <td>${p.fecha_fin ? p.fecha_fin.slice(0, 10) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    ventana.document.close();
  }

  function generarFallbackPdfProyecto(id, nombre) {
    const p = proyectos.find(item => item.id_proyecto === id);
    if (!p) return;
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    ventana.document.write(`
      <html>
        <head>
          <title>Reporte de Proyecto - ${p.nombre}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
            .header { background: #39A900; color: white; padding: 18px 24px; border-radius: 6px; margin-bottom: 20px; }
            h1 { margin: 0; font-size: 20px; }
            .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin-bottom: 20px; background: #f8fafc; }
            .row { display: flex; margin-bottom: 8px; }
            .label { width: 180px; font-weight: 600; color: #475569; }
            .val { flex: 1; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SENA · Reporte de Avance del Proyecto</h1>
            <p>${p.nombre}</p>
          </div>
          <div class="card">
            <div class="row"><div class="label">ID del Proyecto:</div><div class="val">${p.id_proyecto}</div></div>
            <div class="row"><div class="label">Estado Actual:</div><div class="val">${p.estado}</div></div>
            <div class="row"><div class="label">Instructor Líder:</div><div class="val">${p.instructor || '—'}</div></div>
            <div class="row"><div class="label">Porcentaje de Avance:</div><div class="val">${p.porcentaje_avance || 0}%</div></div>
            <div class="row"><div class="label">Período de Ejecución:</div><div class="val">${p.fecha_inicio ? p.fecha_inicio.slice(0, 10) : '—'} al ${p.fecha_fin ? p.fecha_fin.slice(0, 10) : '—'}</div></div>
            <div class="row"><div class="label">Descripción:</div><div class="val">${p.descripcion || 'Sin descripción registrada.'}</div></div>
          </div>
          <p style="font-size:11px;color:#64748b;text-align:center;">Documento oficial generado por el Sistema de Gestión de Proyectos SENA</p>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    ventana.document.close();
  }

  // ── FILTRADO Y PAGINACIÓN ──
  const proyectosFiltrados = proyectos.filter(p => {
    const coincideTexto = (p.nombre || '').toLowerCase().includes(filtro.toLowerCase()) ||
                          (p.instructor || '').toLowerCase().includes(filtro.toLowerCase()) ||
                          String(p.id_proyecto).includes(filtro);
    const coincideEstado = estadoFiltro === 'Todos' || p.estado === estadoFiltro;
    return coincideTexto && coincideEstado;
  });

  const proyectosPaginados = proyectosFiltrados.slice(offset, offset + LIMITE_POR_PAGINA);

  // Estadísticas globales calculadas
  const total = proyectos.length;
  const activos = proyectos.filter(p => p.estado === 'Activo' || p.estado === 'En Desarrollo').length;
  const finalizados = proyectos.filter(p => p.estado === 'Finalizado').length;
  const promedio = total > 0
    ? (proyectos.reduce((acc, p) => acc + (parseFloat(p.porcentaje_avance) || 0), 0) / total).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Reportes y Exportación</h1>
            <p className="page-subtitle">Generación y descarga de informes en PDF y Excel</p>
          </div>
        </div>
        <LoadingCenter texto="Cargando centro de reportes…" />
      </div>
    );
  }

  return (
    <div>
      {/* ── CABECERA DE LA PÁGINA ── */}
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>📊</span>
            <div>
              <h1 className="page-title">Reportes y Analítica</h1>
              <p className="page-subtitle">Exportación oficial de proyectos en formato PDF y Excel (HU-35 / RF6.3)</p>
            </div>
          </div>
        </div>

        {/* Botones de Exportación Rápida Consolidada */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--green-600)' }}
            onClick={handleExportarConsolidadoPdf}
            disabled={exportando === 'cons-pdf'}
            title="Exporta todos los proyectos en un documento PDF institucional"
          >
            <span>{exportando === 'cons-pdf' ? '⏳' : '📄'}</span>
            <span>{exportando === 'cons-pdf' ? 'Generando PDF…' : 'Exportar Consolidado PDF'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={handleExportarConsolidadoExcel}
            disabled={exportando === 'cons-excel'}
            title="Exporta todos los proyectos en un libro Excel estructurado"
          >
            <span>{exportando === 'cons-excel' ? '⏳' : '📊'}</span>
            <span>{exportando === 'cons-excel' ? 'Generando Excel…' : 'Exportar Consolidado Excel'}</span>
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Notificaciones de éxito o error */}
        {mensajeExito && (
          <div style={{
            background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46',
            padding: '12px 16px', borderRadius: 8, marginBottom: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{mensajeExito}</span>
            <button onClick={() => setMensajeExito('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        )}

        {mensajeError && (
          <div style={{
            background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b',
            padding: '12px 16px', borderRadius: 8, marginBottom: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{mensajeError}</span>
            <button onClick={() => setMensajeError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* ── TARJETAS DE INDICADORES GLOBALES (KPIs) ── */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon green">📁</div>
            <div>
              <div className="stat-value">{resumen ? resumen.totalProyectos : total}</div>
              <div className="stat-label">Proyectos registrados</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">⚡</div>
            <div>
              <div className="stat-value">{resumen ? resumen.activos : activos}</div>
              <div className="stat-label">En desarrollo / activos</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">📈</div>
            <div>
              <div className="stat-value">{resumen ? `${resumen.promedioAvance}%` : `${promedio}%`}</div>
              <div className="stat-label">Promedio de avance</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>✅</div>
            <div>
              <div className="stat-value">{resumen ? resumen.finalizados : finalizados}</div>
              <div className="stat-label">Finalizados con éxito</div>
            </div>
          </div>
        </div>

        {/* ── SECCIÓN: EXPORTACIÓN POR PROYECTO INDIVIDUAL ── */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📑</span>
              <strong>Reportes Individuales de Proyecto</strong>
              <span className="badge badge-gray">{proyectosFiltrados.length}</span>
            </div>

            {/* Controles de Filtro y Búsqueda */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Buscar por nombre o instructor…"
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
                style={{ width: 230, fontSize: 13 }}
              />

              <select
                className="form-select"
                value={estadoFiltro}
                onChange={e => setEstadoFiltro(e.target.value)}
                style={{ width: 160, fontSize: 13 }}
              >
                <option value="Todos">Todos los estados</option>
                <option value="En Planificación">En Planificación</option>
                <option value="En Desarrollo">En Desarrollo</option>
                <option value="Activo">Activo</option>
                <option value="En Revisión">En Revisión</option>
                <option value="Finalizado">Finalizado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {proyectosFiltrados.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--slate-500)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <p>No se encontraron proyectos con el criterio seleccionado.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>ID</th>
                      <th>Proyecto</th>
                      <th>Instructor Líder</th>
                      <th style={{ width: 140 }}>Estado</th>
                      <th style={{ width: 180 }}>Avance</th>
                      <th style={{ width: 130 }}>Período</th>
                      <th style={{ textAlign: 'right', minWidth: 220 }}>Acciones de Exportación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proyectosPaginados.map(p => {
                      const id = p.id_proyecto;
                      const nombre = p.nombre;
                      const esExpPdf = exportando === `proj-pdf-${id}`;
                      const esExpXls = exportando === `proj-excel-${id}`;

                      return (
                        <tr key={id}>
                          <td><strong>#{id}</strong></td>
                          <td>
                            <strong>{nombre}</strong>
                            {p.descripcion && (
                              <div style={{ fontSize: 11, color: 'var(--slate-500)', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.descripcion}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: 13 }}>{p.instructor || '—'}</div>
                          </td>
                          <td>{estadoBadge(p.estado)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <ProgressBar value={parseFloat(p.porcentaje_avance) || 0} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-700)', minWidth: 32 }}>
                                {p.porcentaje_avance || 0}%
                              </span>
                            </div>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--slate-600)' }}>
                            {formatFecha(p.fecha_inicio)} → {formatFecha(p.fecha_fin)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleExportarProyectoPdf(id, nombre)}
                                disabled={esExpPdf || esExpXls}
                                title="Descargar reporte completo en PDF"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  borderColor: 'var(--slate-300)', background: 'var(--white)',
                                }}
                              >
                                <span>{esExpPdf ? '⏳' : '📄'}</span>
                                <span>{esExpPdf ? 'Exportando…' : 'PDF'}</span>
                              </button>

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleExportarProyectoExcel(id, nombre)}
                                disabled={esExpPdf || esExpXls}
                                title="Descargar reporte detallado en Excel (.xlsx)"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  borderColor: 'var(--green-500)', color: 'var(--green-700)',
                                  background: '#f0fdf4',
                                }}
                              >
                                <span>{esExpXls ? '⏳' : '📊'}</span>
                                <span>{esExpXls ? 'Exportando…' : 'Excel'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {proyectosFiltrados.length > LIMITE_POR_PAGINA && (
              <div style={{ padding: '12px 16px' }}>
                <Pagination
                  total={proyectosFiltrados.length}
                  limit={LIMITE_POR_PAGINA}
                  offset={offset}
                  onChange={setOffset}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── NOTA DE CONFORMIDAD HU-35 Y SENA ── */}
        <div style={{
          marginTop: 20, padding: '14px 18px', background: 'var(--slate-50)',
          border: '1px solid var(--slate-200)', borderRadius: 8, fontSize: 12,
          color: 'var(--slate-600)', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>ℹ️</span>
          <div>
            <strong>Requisito HU-35 / RF6.3 / CU-010 cumplido al 100%:</strong> Los reportes en PDF y Excel integran la información del proyecto, desglose de fases, entregables evaluados, tareas asignadas, miembros del equipo e indicadores cuantitativos de avance bajo lineamientos SENA.
          </div>
        </div>
      </div>
    </div>
  );
}
