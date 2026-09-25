// =====================================================
// components/EliminarUsuarioModal.jsx  (NUEVO)
// Cuestionario obligatorio antes de eliminar a un usuario:
//   1. Motivo (lista cerrada) + descripción (mínimo 20 caracteres).
//   2. Instructor de reemplazo, si el usuario dirige proyectos.
//   3. Archivos de soporte opcionales (PDF, JPG, PNG o WEBP; hasta 5).
//   4. Confirmación explícita de que la eliminación es definitiva.
// Todo queda guardado en el Historial → "Usuarios eliminados".
// =====================================================
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usuariosService } from '../services/api.js';
import { LoadingCenter, portalDestino } from './helpers.jsx';

const TIPOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_ARCHIVOS = 5;
const MAX_MB = 10;

const ETIQUETAS_IMPACTO = {
  proyectos: 'Proyectos que dirige (se reasignan)',
  tareas: 'Tareas asignadas (se eliminan)',
  entregas: 'Entregas de tareas (se eliminan)',
  equipos: 'Equipos de proyecto (sale de ellos)',
  mensajes: 'Mensajes (quedan como "Usuario eliminado")',
  comentarios: 'Comentarios (quedan como "Usuario eliminado")',
  evaluaciones: 'Evaluaciones (quedan como "Usuario eliminado")',
  notificaciones: 'Notificaciones recibidas (se eliminan)',
  solicitudes: 'Solicitudes enviadas (se eliminan)',
};

export default function EliminarUsuarioModal({ usuario, onClose, onEliminado }) {
  const [info, setInfo] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [motivo, setMotivo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [reemplazo, setReemplazo] = useState('');
  const [archivos, setArchivos] = useState([]);
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    usuariosService.impactoEliminacion(usuario.id_usuario)
      .then(r => setInfo(r.data.data))
      .catch(err => setErrorCarga(err.response?.data?.message || 'No se pudo cargar la información del usuario'));
  }, [usuario.id_usuario]);

  function agregarArchivos(e) {
    const nuevos = Array.from(e.target.files || []);
    e.target.value = '';
    setError('');
    for (const f of nuevos) {
      if (!TIPOS.includes(f.type)) { setError(`"${f.name}": solo se permiten PDF, JPG, PNG o WEBP`); return; }
      if (f.size > MAX_MB * 1024 * 1024) { setError(`"${f.name}" supera los ${MAX_MB} MB`); return; }
    }
    const total = [...archivos, ...nuevos];
    if (total.length > MAX_ARCHIVOS) { setError(`Máximo ${MAX_ARCHIVOS} archivos de soporte`); return; }
    setArchivos(total);
  }

  const requiereReemplazo = (info?.impacto?.proyectos || 0) > 0;
  const valido = motivo && descripcion.trim().length >= 20 && confirmado && (!requiereReemplazo || reemplazo);

  async function eliminar(e) {
    e.preventDefault();
    if (!valido) return;
    setEnviando(true); setError('');
    try {
      const r = await usuariosService.eliminarConJustificacion(usuario.id_usuario, {
        motivo, descripcion: descripcion.trim(), id_instructor_reemplazo: reemplazo || undefined, archivos,
      });
      onEliminado(r.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el usuario');
    } finally {
      setEnviando(false);
    }
  }

  const impactoVisible = info ? Object.entries(info.impacto).filter(([, n]) => n > 0) : [];

  return createPortal(
    <div className="modal-overlay" onClick={enviando ? undefined : onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">🛑 Eliminar usuario</span>
          <button className="modal-close" onClick={onClose} disabled={enviando}>×</button>
        </div>
        <form onSubmit={eliminar}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {errorCarga && <div className="alert alert-error">{errorCarga}</div>}
            {!info && !errorCarga && <LoadingCenter />}
            {info && (
              <>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--red-50)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 26 }}>👤</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{info.usuario.nombres} {info.usuario.apellidos}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate-600)' }}>
                      {info.usuario.rol} · cc {info.usuario.identificacion || '—'} · {info.usuario.correo}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Lo que pasará con su información</label>
                  {impactoVisible.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>No tiene información asociada.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: 12, background: 'var(--slate-50)', borderRadius: 8, padding: '10px 12px' }}>
                      {impactoVisible.map(([k, n]) => (
                        <div key={k} style={{ display: 'contents' }}>
                          <span style={{ color: 'var(--slate-600)' }}>{ETIQUETAS_IMPACTO[k] || k}</span>
                          <strong style={{ textAlign: 'right' }}>{n}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {requiereReemplazo && (
                  <div className="form-group">
                    <label className="form-label">¿A qué instructor se reasignan sus {info.impacto.proyectos} proyecto(s)? *</label>
                    {info.instructoresDisponibles.length === 0 ? (
                      <div className="alert alert-error">No hay otro instructor activo. Crea o activa uno antes de eliminar a este usuario.</div>
                    ) : (
                      <select className="form-select" value={reemplazo} onChange={e => setReemplazo(e.target.value)} required>
                        <option value="">Selecciona un instructor…</option>
                        {info.instructoresDisponibles.map(i => (
                          <option key={i.id_usuario} value={i.id_usuario}>{i.nombre}{i.identificacion ? ` (cc ${i.identificacion})` : ''}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">1. ¿Por qué se elimina este usuario? *</label>
                  <select className="form-select" value={motivo} onChange={e => setMotivo(e.target.value)} required>
                    <option value="">Selecciona un motivo…</option>
                    {info.motivos.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">2. Describe la situación *</label>
                  <textarea className="form-textarea" rows={4} maxLength={5000} value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    placeholder="Explica los hechos, fechas y quién lo solicitó o autorizó…" />
                  <span className="form-hint" style={{ color: descripcion.trim().length >= 20 ? 'var(--green-700)' : undefined }}>
                    {descripcion.trim().length}/20 caracteres mínimos
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">3. Archivos de soporte (opcional)</label>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 8 }}>
                    Actas, cartas de retiro, correos o evidencias. PDF, JPG, PNG o WEBP · máx. {MAX_MB} MB c/u · hasta {MAX_ARCHIVOS}.
                  </p>
                  {archivos.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                      {archivos.map((f, i) => (
                        <div key={`${f.name}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, background: 'var(--slate-50)', borderRadius: 6, padding: '6px 10px' }}>
                          <span>📄 {f.name} <span style={{ color: 'var(--slate-400)' }}>({(f.size / 1024).toFixed(0)} KB)</span></span>
                          <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 6px' }}
                            onClick={() => setArchivos(archivos.filter((_, j) => j !== i))}>Quitar</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {archivos.length < MAX_ARCHIVOS && (
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                      📎 Adjuntar archivos
                      <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={agregarArchivos} />
                    </label>
                  )}
                </div>

                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer', background: 'var(--amber-100)', borderRadius: 8, padding: '10px 12px' }}>
                  <input type="checkbox" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} style={{ marginTop: 3 }} />
                  <span>Entiendo que la eliminación es <strong>definitiva</strong> y que este cuestionario quedará registrado en el historial.</span>
                </label>

                {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={enviando}>Cancelar</button>
            <button type="submit" className="btn btn-danger" disabled={!valido || enviando}>
              {enviando ? 'Eliminando…' : '🗑️ Eliminar definitivamente'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    portalDestino()
  );
}
