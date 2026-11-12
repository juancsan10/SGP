// =====================================================
// pages/CalendarioPage.jsx  (MEJORADO)
// Calendario de tareas, entregables y reuniones de un proyecto con tres
// vistas: Mes (cuadrícula tipo almanaque), Semana y Lista.
// Antes era solo una tabla; la lista se conserva como una de las vistas.
// =====================================================
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agendaService, proyectosService } from '../services/api.js';
import { LoadingCenter, EmptyState, Pagination } from '../components/helpers.jsx';
import {
  TIPOS_EVENTO, DIAS_SEMANA, agruparPorDia, compararEventos, claveDeFecha, cuadriculaMes,
  diasDeSemana, diaDeEvento, etiquetaDia, etiquetaMes, fechaDeClave, horaEvento,
} from '../utils/calendario.js';

const VISTAS = [
  { id: 'mes',    etiqueta: 'Mes',    icono: '🗓️' },
  { id: 'semana', etiqueta: 'Semana', icono: '📆' },
  { id: 'lista',  etiqueta: 'Lista',  icono: '📋' },
];
const MAX_EN_CELDA = 3;
const LIMITE_LISTA = 10;
const CLAVE_VISTA = 'sgp_calendario_vista';

function leerVista() {
  try { const v = localStorage.getItem(CLAVE_VISTA); return VISTAS.some(x => x.id === v) ? v : 'mes'; } catch { return 'mes'; }
}
function guardarVista(v) {
  try { localStorage.setItem(CLAVE_VISTA, v); } catch { /* almacenamiento no disponible */ }
}

export default function CalendarioPage() {
  const navigate = useNavigate();
  const hoy = useMemo(() => new Date(), []);
  const claveHoy = claveDeFecha(hoy);

  const [proyectos, setProyectos] = useState([]);
  const [pid, setPid] = useState('');
  const [eventos, setEventos] = useState([]);
  const [cargandoProyectos, setCargandoProyectos] = useState(true);
  const [pidCargado, setPidCargado] = useState(''); // proyecto cuyas actividades ya están en pantalla
  const [error, setError] = useState('');

  const [vista, setVista] = useState(leerVista);
  const [referencia, setReferencia] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  const [diaSel, setDiaSel] = useState(claveHoy);
  const [offsetLista, setOffsetLista] = useState(0);

  // Proyectos visibles para el usuario; se elige el primero automáticamente.
  useEffect(() => {
    proyectosService.getAll()
      .then(r => {
        const lista = r.data.data || [];
        setProyectos(lista);
        if (lista.length) setPid(String(lista[0].id_proyecto));
      })
      .catch(err => setError(err.response?.data?.message || 'No se pudieron cargar los proyectos'))
      .finally(() => setCargandoProyectos(false));
  }, []);

  useEffect(() => {
    if (!pid) { setEventos([]); return undefined; }
    let vigente = true;
    setError(''); setOffsetLista(0);
    agendaService.calendar(pid)
      .then(r => { if (vigente) setEventos(r.data.data || []); })
      .catch(err => { if (vigente) { setEventos([]); setError(err.response?.data?.message || 'No se pudo cargar el calendario del proyecto'); } })
      .finally(() => { if (vigente) setPidCargado(pid); });
    return () => { vigente = false; };
  }, [pid]);

  // Mientras llegan las actividades del proyecto elegido se muestra la carga
  // (sin mostrar un instante la cuadrícula vacía ni las del proyecto anterior).
  const cargando = !!pid && pidCargado !== pid;
  const porDia = useMemo(() => agruparPorDia(eventos), [eventos]);
  const ordenados = useMemo(() => eventos.filter(e => diaDeEvento(e)).sort(compararEventos), [eventos]);

  function cambiarVista(v) { setVista(v); guardarVista(v); }

  function mover(paso) {
    const r = referencia;
    const nueva = vista === 'semana'
      ? new Date(r.getFullYear(), r.getMonth(), r.getDate() + 7 * paso)
      : new Date(r.getFullYear(), r.getMonth() + paso, 1);
    setReferencia(nueva);
  }
  function irAHoy() {
    setReferencia(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
    setDiaSel(claveHoy);
  }

  const semana = diasDeSemana(referencia);
  const tituloPeriodo = vista === 'semana'
    ? `${etiquetaDia(semana[0], { day: 'numeric', month: 'short' })} – ${etiquetaDia(semana[6], { day: 'numeric', month: 'short', year: 'numeric' })}`
    : etiquetaMes(referencia.getFullYear(), referencia.getMonth());

  const abrirProyecto = () => navigate(`/proyectos/${pid}`);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Calendario de actividades</h1>
          <p className="page-subtitle">Fechas de tareas, entregables y reuniones del proyecto.</p>
        </div>
        <label className="sr-only" htmlFor="calendario-proyecto">Proyecto</label>
        <select id="calendario-proyecto" className="form-select" style={{ maxWidth: 320 }} value={pid}
          onChange={e => setPid(e.target.value)} disabled={!proyectos.length}>
          {!proyectos.length && <option value="">Sin proyectos</option>}
          {proyectos.map(p => <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre}</option>)}
        </select>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

        {cargandoProyectos ? <LoadingCenter /> : !proyectos.length ? (
          <div className="card"><EmptyState icon="🗓️" titulo="No tienes proyectos todavía" desc="Cuando participes en un proyecto, aquí verás sus fechas." /></div>
        ) : (
          <div className="card calendario">
            {/* Barra: navegación del periodo + selector de vista */}
            <div className="calendario-barra">
              <div className="calendario-nav">
                {vista !== 'lista' && (
                  <>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => mover(-1)}
                      aria-label={vista === 'semana' ? 'Semana anterior' : 'Mes anterior'}>‹</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={irAHoy}>Hoy</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => mover(1)}
                      aria-label={vista === 'semana' ? 'Semana siguiente' : 'Mes siguiente'}>›</button>
                  </>
                )}
                <h2 className="calendario-periodo" aria-live="polite">
                  {vista === 'lista' ? `${ordenados.length} actividades` : tituloPeriodo}
                </h2>
              </div>
              <div className="segmentado" role="group" aria-label="Tipo de vista">
                {VISTAS.map(v => (
                  <button key={v.id} type="button" aria-pressed={vista === v.id}
                    className={`segmentado-opcion ${vista === v.id ? 'activo' : ''}`} onClick={() => cambiarVista(v.id)}>
                    <span aria-hidden="true">{v.icono}</span> {v.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            <Leyenda />

            {cargando ? <LoadingCenter texto="Cargando actividades…" /> : (
              <>
                {vista === 'mes' && (
                  <VistaMes referencia={referencia} porDia={porDia} claveHoy={claveHoy}
                    diaSel={diaSel} onElegirDia={setDiaSel} onAbrir={abrirProyecto} />
                )}
                {vista === 'semana' && (
                  <VistaSemana dias={semana} porDia={porDia} claveHoy={claveHoy} onAbrir={abrirProyecto} />
                )}
                {vista === 'lista' && (
                  ordenados.length === 0
                    ? <EmptyState icon="📭" titulo="Sin actividades con fecha" desc="Las tareas, entregables y reuniones con fecha aparecerán aquí." />
                    : (
                      <>
                        <VistaLista eventos={ordenados.slice(offsetLista, offsetLista + LIMITE_LISTA)} claveHoy={claveHoy} />
                        <div style={{ padding: '0 16px 16px' }}>
                          <Pagination total={ordenados.length} limit={LIMITE_LISTA} offset={offsetLista} onChange={setOffsetLista} />
                        </div>
                      </>
                    )
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Leyenda() {
  return (
    <div className="calendario-leyenda" aria-label="Tipos de actividad">
      {Object.entries(TIPOS_EVENTO).map(([tipo, t]) => (
        <span key={tipo} className={`cal-chip cal-${tipo}`}><span aria-hidden="true">{t.icono}</span> {t.etiqueta}</span>
      ))}
    </div>
  );
}

function ChipEvento({ evento, onAbrir, compacto = false }) {
  const tipo = TIPOS_EVENTO[evento.type] ? evento.type : 'tarea';
  const hora = horaEvento(evento.start);
  const texto = `${TIPOS_EVENTO[tipo].etiqueta}: ${evento.title}${hora ? ` a las ${hora}` : ''}`;
  return (
    <button type="button" className={`cal-evento cal-${tipo} ${compacto ? 'compacto' : ''}`}
      title={texto} aria-label={`${texto}. Abrir el proyecto`} onClick={onAbrir}>
      {hora && <span className="cal-evento-hora">{hora}</span>}
      <span className="cal-evento-titulo">{evento.title}</span>
    </button>
  );
}

// ── Vista Mes: cuadrícula tipo almanaque ───────────────
function VistaMes({ referencia, porDia, claveHoy, diaSel, onElegirDia, onAbrir }) {
  const celdas = cuadriculaMes(referencia.getFullYear(), referencia.getMonth());
  const eventosDia = porDia[diaSel] || [];

  return (
    <>
      <div className="cal-mes" role="grid" aria-label={etiquetaMes(referencia.getFullYear(), referencia.getMonth())}>
        <div className="cal-fila cal-encabezado" role="row">
          {DIAS_SEMANA.map(d => <div key={d} role="columnheader" className="cal-dia-semana">{d}</div>)}
        </div>
        {Array.from({ length: 6 }, (_, s) => (
          <div className="cal-fila" role="row" key={s}>
            {celdas.slice(s * 7, s * 7 + 7).map(c => {
              const lista = porDia[c.clave] || [];
              const etiqueta = `${etiquetaDia(c.fecha)}: ${lista.length ? `${lista.length} actividad${lista.length > 1 ? 'es' : ''}` : 'sin actividades'}`;
              return (
                <div key={c.clave} role="gridcell" aria-selected={diaSel === c.clave}
                  className={`cal-celda ${c.delMes ? '' : 'fuera'} ${c.clave === claveHoy ? 'hoy' : ''} ${diaSel === c.clave ? 'seleccionado' : ''}`}>
                  <button type="button" className="cal-numero" aria-label={etiqueta} onClick={() => onElegirDia(c.clave)}>
                    {c.fecha.getDate()}
                  </button>
                  <div className="cal-eventos">
                    {lista.slice(0, MAX_EN_CELDA).map(e => <ChipEvento key={`${e.type}-${e.id}`} evento={e} onAbrir={onAbrir} compacto />)}
                    {lista.length > MAX_EN_CELDA && (
                      <button type="button" className="cal-mas" onClick={() => onElegirDia(c.clave)}>
                        +{lista.length - MAX_EN_CELDA} más
                      </button>
                    )}
                  </div>
                  {/* En pantallas pequeñas se ven puntos de color en lugar de chips */}
                  {lista.length > 0 && (
                    <div className="cal-puntos" aria-hidden="true">
                      {lista.slice(0, 4).map(e => <span key={`${e.type}-${e.id}`} className={`cal-punto cal-${e.type}`} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Detalle del día elegido */}
      <section className="cal-detalle" aria-live="polite">
        <h3>{etiquetaDia(fechaDeClave(diaSel))}{diaSel === claveHoy ? ' · Hoy' : ''}</h3>
        {eventosDia.length === 0
          ? <p className="cal-vacio">Sin actividades para este día.</p>
          : <div className="cal-detalle-lista">{eventosDia.map(e => <ChipEvento key={`${e.type}-${e.id}`} evento={e} onAbrir={onAbrir} />)}</div>}
      </section>
    </>
  );
}

// ── Vista Semana: siete columnas ───────────────────────
function VistaSemana({ dias, porDia, claveHoy, onAbrir }) {
  return (
    <div className="cal-semana">
      {dias.map(d => {
        const clave = claveDeFecha(d);
        const lista = porDia[clave] || [];
        return (
          <section key={clave} className={`cal-semana-dia ${clave === claveHoy ? 'hoy' : ''}`} aria-label={etiquetaDia(d)}>
            <header>
              <span className="cal-semana-nombre">{DIAS_SEMANA[(d.getDay() + 6) % 7]}</span>
              <span className="cal-semana-numero">{d.getDate()}</span>
            </header>
            {lista.length === 0
              ? <p className="cal-vacio">—</p>
              : lista.map(e => <ChipEvento key={`${e.type}-${e.id}`} evento={e} onAbrir={onAbrir} />)}
          </section>
        );
      })}
    </div>
  );
}

// ── Vista Lista: tabla ordenada (la vista original) ────
function VistaLista({ eventos, claveHoy }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Tipo</th><th>Actividad</th><th>Fecha</th><th>Hora</th></tr></thead>
        <tbody>
          {eventos.map(e => {
            const clave = diaDeEvento(e);
            const tipo = TIPOS_EVENTO[e.type] ? e.type : 'tarea';
            return (
              <tr key={`${e.type}-${e.id}`}>
                <td><span className={`cal-chip cal-${tipo}`}>{TIPOS_EVENTO[tipo].etiqueta}</span></td>
                <td>{e.title}</td>
                <td>
                  {etiquetaDia(fechaDeClave(clave), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  {clave === claveHoy && <span className="badge badge-slate" style={{ marginLeft: 6 }}>Hoy</span>}
                </td>
                <td>{horaEvento(e.start) || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
