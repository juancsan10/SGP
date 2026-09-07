import { useEffect, useState } from 'react';
import { proyectosService, tareasService, entregasService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingCenter, EmptyState, formatFecha } from '../components/helpers.jsx';

export default function EntregasPage() {
  const { usuario, esAdmin, esInstructor, esAprendiz } = useAuth();
  const [tareas,setTareas]=useState([]); const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(null); const [entrega,setEntrega]=useState(null);
  const [form,setForm]=useState({comentario_aprendiz:'',url_entrega:'',ruta_archivo:''});
  const [revision,setRevision]=useState({estado:'Aprobada',observacion_instructor:''});
  const [error,setError]=useState(''); const [saving,setSaving]=useState(false);

  async function cargar(){
    setLoading(true); try{
      const p=await proyectosService.getAll(); const ps=p.data.data||[];
      const rs=await Promise.allSettled(ps.map(x=>tareasService.getByProyecto(x.id_proyecto).then(r=>(r.data.data||[]).map(t=>({...t,proyecto_nombre:x.nombre})) )));
      setTareas(rs.filter(x=>x.status==='fulfilled').flatMap(x=>x.value));
    } catch(e){setError('No se pudieron cargar las tareas');} finally{setLoading(false);}
  }
  useEffect(()=>{cargar();},[]);
  const visibles=tareas.filter(t=>esAprendiz ? Number(t.id_asignado)===Number(usuario?.id_usuario) : true);

  async function abrir(t,tipo){setError('');setEntrega(null);setModal({t,tipo});try{const r=await entregasService.getByTarea(t.id_tarea);setEntrega(r.data.data);if(tipo==='entrega')setForm({comentario_aprendiz:r.data.data?.comentario_aprendiz||'',url_entrega:r.data.data?.url_entrega||'',ruta_archivo:r.data.data?.ruta_archivo||''});else setRevision({estado:r.data.data?.estado==='Requiere corrección'?'Requiere corrección':'Aprobada',observacion_instructor:r.data.data?.observacion_instructor||''});}catch(e){setError(e.response?.data?.message||'No se pudo cargar la entrega');}}
  async function enviar(e){e.preventDefault();setSaving(true);setError('');try{await entregasService.submit(modal.t.id_tarea,form);setModal(null);await cargar();}catch(e){setError(e.response?.data?.message||'No se pudo enviar');}finally{setSaving(false);}}
  async function revisar(e){e.preventDefault();setSaving(true);setError('');try{await entregasService.review(modal.t.id_tarea,revision);setModal(null);}catch(e){setError(e.response?.data?.message||'No se pudo guardar la revisión');}finally{setSaving(false);}}

  if(loading)return <LoadingCenter/>;
  return <div><div className="page-header"><div className="page-header-left"><h1 className="page-title">Entregas</h1><p className="page-subtitle">{esAprendiz?'Entrega y corrección de tus tareas':'Revisión de entregas de los proyectos'}</p></div></div><div className="page-body">
    {visibles.length===0?<EmptyState icon="📤" titulo="Sin tareas" desc="No hay tareas disponibles para gestionar entregas."/>:<div className="card"><div className="table-wrap"><table><thead><tr><th>Tarea</th><th>Proyecto</th><th>Asignado</th><th>Vencimiento</th><th>Acción</th></tr></thead><tbody>{visibles.map(t=><tr key={t.id_tarea}><td><strong>{t.titulo}</strong></td><td>{t.proyecto_nombre}</td><td>{t.asignado_nombre}</td><td>{formatFecha(t.fecha_vencimiento)}</td><td>{esAprendiz&&Number(t.id_asignado)===Number(usuario?.id_usuario)&&<button className="btn btn-primary btn-sm" onClick={()=>abrir(t,'entrega')}>📤 Entregar / corregir</button>}{(esInstructor||esAdmin)&&<button className="btn btn-secondary btn-sm" onClick={()=>abrir(t,'revision')}>🔎 Revisar</button>}</td></tr>)}</tbody></table></div></div>}
  </div>
  {modal&&<div className="modal-overlay" onClick={()=>setModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-header"><span className="modal-title">{modal.tipo==='entrega'?'Entrega de tarea':'Revisión de entrega'}</span><button className="modal-close" onClick={()=>setModal(null)}>×</button></div><form onSubmit={modal.tipo==='entrega'?enviar:revisar}><div className="modal-body"><strong>{modal.t.titulo}</strong>{error&&<div className="alert alert-error">{error}</div>}{entrega?.estado&&<div className="badge badge-blue">Estado: {entrega.estado}</div>}{modal.tipo==='entrega'?<><div className="form-group"><label className="form-label">Comentario</label><textarea className="form-textarea" value={form.comentario_aprendiz} onChange={e=>setForm({...form,comentario_aprendiz:e.target.value})}/></div><div className="form-group"><label className="form-label">Enlace</label><input className="form-input" type="url" value={form.url_entrega} onChange={e=>setForm({...form,url_entrega:e.target.value})} placeholder="https://…"/></div><div className="form-group"><label className="form-label">Referencia de archivo</label><input className="form-input" value={form.ruta_archivo} onChange={e=>setForm({...form,ruta_archivo:e.target.value})}/></div>{entrega?.estado==='Requiere corrección'&&<div className="alert alert-info">Esta entrega requiere corrección. Al enviarla pasará a <strong>Corregida</strong>.</div>}</>:<>{entrega?<><div className="alert alert-info">Aprendiz: {entrega.aprendiz_nombre} · Identificación: {entrega.identificacion}</div>{entrega.comentario_aprendiz&&<div>{entrega.comentario_aprendiz}</div>}{entrega.url_entrega&&<a href={entrega.url_entrega} target="_blank" rel="noreferrer">Abrir entrega ↗</a>}</>:<div className="alert alert-info">Esta tarea todavía no tiene entrega.</div>}<div className="form-group"><label className="form-label">Resultado</label><select className="form-select" value={revision.estado} onChange={e=>setRevision({...revision,estado:e.target.value})}><option>En revisión</option><option>Requiere corrección</option><option>Aprobada</option></select></div><div className="form-group"><label className="form-label">Retroalimentación</label><textarea className="form-textarea" value={revision.observacion_instructor} onChange={e=>setRevision({...revision,observacion_instructor:e.target.value})}/></div></>}</div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={()=>setModal(null)}>Cancelar</button><button className="btn btn-primary" disabled={saving||((modal.tipo==='revision')&&!entrega)}>{saving?'Guardando…':modal.tipo==='entrega'?'Enviar entrega':'Guardar revisión'}</button></div></form></div></div>}</div>;
}
