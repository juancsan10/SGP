// =====================================================
// components/ChatProyecto.jsx  (NUEVO — punto 6, #19)
// Chat del proyecto más completo, al estilo de WhatsApp:
// · Formato (*negrita*, _cursiva_, ~tachado~, `código`, listas), emojis.
// · Responder a un mensaje (cita del original).
// · Firma personal que se agrega al final del mensaje.
// · Encuestas con resultados animados (un voto por persona, se puede cambiar).
// · Avisos del instructor responsable, fijados arriba del chat.
// Conserva lo que ya existía: editar solo los mensajes propios y ver el
// rechazo del glosario de palabras prohibidas.
// =====================================================
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { mensajesService } from '../services/api.js';
import { portalDestino, ModalHeader, NotaObligatorios, useModalAccesible } from './helpers.jsx';
import { renderFormato, textoPlano, envolverSeleccion } from '../utils/formatoMensaje.jsx';

const EMOJIS = ['👍', '👏', '🙌', '🎉', '✅', '❌', '⚠️', '📌', '📅', '⏰', '💡', '🔥', '🙏', '😊', '😅', '🤔'];
const CLAVE_FIRMA = 'sgp_chat_incluir_firma';
const leerPreferenciaFirma = () => { try { return localStorage.getItem(CLAVE_FIRMA) === '1'; } catch { return false; } };
const guardarPreferenciaFirma = (v) => { try { localStorage.setItem(CLAVE_FIRMA, v ? '1' : '0'); } catch { /* sin almacenamiento */ } };
const hora = (f) => new Date(f).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// ── Encuesta ──────────────────────────────────────────
function Encuesta({ mensaje, onVotada }) {
  const e = mensaje.encuesta || { opciones: [], total_votos: 0, mi_opcion: null };
  const [votando, setVotando] = useState(null);
  const [error, setError] = useState('');
  // Las barras parten de 0 y crecen al aparecer (la transición CSS se desactiva con «reducir movimiento»).
  const [visible, setVisible] = useState(false);
  useEffect(() => { const f = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(f); }, []);

  async function votar(idOpcion) {
    if (idOpcion === e.mi_opcion) return;
    setVotando(idOpcion); setError('');
    try {
      const r = await mensajesService.votar(mensaje.id_mensaje, idOpcion);
      onVotada(mensaje.id_mensaje, r.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar tu voto');
    } finally {
      setVotando(null);
    }
  }

  return (
    <div className="encuesta" role="group" aria-label={`Encuesta: ${textoPlano(mensaje.contenido)}`}>
      <div className="encuesta-pregunta"><span aria-hidden="true">📊</span> {renderFormato(mensaje.contenido)}</div>
      <div className="encuesta-opciones">
        {e.opciones.map(o => {
          const pct = e.total_votos ? Math.round((o.votos / e.total_votos) * 100) : 0;
          const mia = e.mi_opcion === o.id_opcion;
          return (
            <button key={o.id_opcion} type="button" className={`encuesta-opcion ${mia ? 'mia' : ''}`}
              aria-pressed={mia} disabled={votando !== null}
              aria-label={`${o.texto}: ${o.votos} voto${o.votos === 1 ? '' : 's'} (${pct}%)${mia ? ', tu voto' : ''}`}
              onClick={() => votar(o.id_opcion)}>
              <span className="encuesta-barra" style={{ width: visible ? `${pct}%` : 0 }} aria-hidden="true" />
              <span className="encuesta-texto">{mia && <span aria-hidden="true">✓ </span>}{o.texto}</span>
              <span className="encuesta-pct" aria-hidden="true">{pct}%</span>
            </button>
          );
        })}
      </div>
      <div className="encuesta-pie">
        {e.total_votos} voto{e.total_votos === 1 ? '' : 's'} · {e.mi_opcion ? 'Toca otra opción para cambiar tu voto' : 'Toca una opción para votar'}
      </div>
      {error && <div className="alert alert-error" role="alert" style={{ marginTop: 6, fontSize: 12 }}>{error}</div>}
    </div>
  );
}

// ── Aviso: crear encuesta ─────────────────────────────
function EncuestaModal({ onClose, onCrear }) {
  const [pregunta, setPregunta] = useState('');
  const [opciones, setOpciones] = useState(['', '']);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const ref = useModalAccesible(true, enviando ? undefined : onClose);
  const validas = opciones.map(o => o.trim()).filter(Boolean);

  async function enviar(ev) {
    ev.preventDefault(); setError('');
    if (pregunta.trim().length < 3) { setError('Escribe la pregunta de la encuesta.'); return; }
    if (validas.length < 2) { setError('La encuesta necesita al menos 2 opciones.'); return; }
    if (new Set(validas.map(o => o.toLowerCase())).size !== validas.length) { setError('Las opciones no se pueden repetir.'); return; }
    setEnviando(true);
    const fallo = await onCrear(pregunta.trim(), validas);
    if (fallo) { setError(fallo); setEnviando(false); }
  }

  return createPortal(
    <div className="modal-overlay" onClick={enviando ? undefined : onClose}>
      <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="encuesta-titulo" style={{ maxWidth: 520 }} onClick={ev => ev.stopPropagation()}>
        <ModalHeader id="encuesta-titulo" icono="📊" titulo="Nueva encuesta"
          descripcion="El equipo vota con un toque y ve los resultados al instante. Cada persona tiene un voto." onClose={enviando ? undefined : onClose} />
        <form onSubmit={enviar}>
          <div className="modal-body">
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <div className="form-group">
              <label className="form-label" htmlFor="encuesta-pregunta">Pregunta *</label>
              <input id="encuesta-pregunta" className="form-input" maxLength={300} placeholder="Ej. ¿Qué día hacemos la revisión?"
                value={pregunta} onChange={ev => setPregunta(ev.target.value)} />
            </div>
            <span className="form-label">Opciones * <span style={{ fontWeight: 400, color: 'var(--slate-500)' }}>(de 2 a 6)</span></span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {opciones.map((o, i) => (
                <div key={i} style={{ display: 'flex', gap: 6 }}>
                  <input className="form-input" maxLength={150} aria-label={`Opción ${i + 1}`} placeholder={`Opción ${i + 1}`}
                    value={o} onChange={ev => setOpciones(ops => ops.map((x, j) => (j === i ? ev.target.value : x)))} />
                  {opciones.length > 2 && (
                    <button type="button" className="btn btn-ghost btn-sm" aria-label={`Quitar la opción ${i + 1}`}
                      onClick={() => setOpciones(ops => ops.filter((_, j) => j !== i))}>✕</button>
                  )}
                </div>
              ))}
            </div>
            {opciones.length < 6 && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setOpciones(ops => [...ops, ''])}>
                + Agregar opción
              </button>
            )}
          </div>
          <div className="modal-footer">
            <NotaObligatorios />
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={enviando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Publicando…' : 'Publicar encuesta'}</button>
          </div>
        </form>
      </div>
    </div>,
    portalDestino()
  );
}

// ── Aviso: firma personal ─────────────────────────────
function FirmaModal({ inicial, onClose, onGuardada }) {
  const [firma, setFirma] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const ref = useModalAccesible(true, guardando ? undefined : onClose);

  async function guardar(ev) {
    ev.preventDefault(); setGuardando(true); setError('');
    try {
      await mensajesService.setFirma(firma.trim());
      onGuardada(firma.trim());
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar la firma');
      setGuardando(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={guardando ? undefined : onClose}>
      <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="firma-titulo" style={{ maxWidth: 480 }} onClick={ev => ev.stopPropagation()}>
        <ModalHeader id="firma-titulo" icono="✍️" titulo="Mi firma"
          descripcion="Se agrega al final de tus mensajes cuando marcas «Agregar mi firma»." onClose={guardando ? undefined : onClose} />
        <form onSubmit={guardar}>
          <div className="modal-body">
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <div className="form-group">
              <label className="form-label" htmlFor="firma-texto">Firma</label>
              <input id="firma-texto" className="form-input" maxLength={150} placeholder="Ej. Laura Gómez · Instructora ADSO"
                value={firma} onChange={ev => setFirma(ev.target.value)} />
              <span className="form-hint">{firma.trim().length}/150 · Déjala vacía para quitarla.</span>
            </div>
            {firma.trim() && <div className="msg-firma" style={{ marginTop: 0 }}>— {firma.trim()}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar firma'}</button>
          </div>
        </form>
      </div>
    </div>,
    portalDestino()
  );
}

// ── Chat ──────────────────────────────────────────────
export default function ChatProyecto({ idProyecto, mensajes, setMensajes, usuario, puedePublicarAvisos }) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [respondiendo, setRespondiendo] = useState(null);
  const [comoAviso, setComoAviso] = useState(false);
  const [incluirFirma, setIncluirFirma] = useState(leerPreferenciaFirma);
  const [firma, setFirma] = useState('');
  const [modal, setModal] = useState(null); // 'encuesta' | 'firma'
  const [verEmojis, setVerEmojis] = useState(false);
  const [editando, setEditando] = useState(null);
  const [textoEditando, setTextoEditando] = useState('');
  const [errorEdicion, setErrorEdicion] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [aviso, setAviso] = useState('');
  const refTexto = useRef(null);
  const refFinal = useRef(null);

  useEffect(() => {
    mensajesService.getFirma?.()
      .then(r => setFirma(r?.data?.data?.firma || ''))
      .catch(() => setFirma(''));
  }, []);
  useEffect(() => { refFinal.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }); }, [mensajes.length]);

  async function recargar() {
    const r = await mensajesService.getByProyecto(idProyecto);
    setMensajes(r.data.data || []);
  }

  // Devuelve el mensaje de error o null.
  async function publicar(contenido, extra = {}) {
    setError(''); setEnviando(true);
    const datos = { contenido, id_proyecto: idProyecto, ...extra };
    if (respondiendo) datos.id_respuesta_a = respondiendo.id_mensaje;
    if (incluirFirma && firma) datos.incluir_firma = true;
    try {
      await mensajesService.create(datos);
      setRespondiendo(null);
      await recargar();
      return null;
    } catch (err) {
      const msg = err.response?.data?.message || 'No se pudo enviar el mensaje';
      setError(msg);
      return msg;
    } finally {
      setEnviando(false);
    }
  }

  async function enviar(ev) {
    ev.preventDefault();
    if (!texto.trim() || enviando) return;
    const fallo = await publicar(texto.trim(), comoAviso ? { tipo: 'aviso' } : {});
    if (!fallo) { setTexto(''); setComoAviso(false); }
  }

  function formatear(marcador) {
    const r = envolverSeleccion(refTexto.current, texto, marcador);
    setTexto(r.valor);
    requestAnimationFrame(() => { refTexto.current?.focus(); refTexto.current?.setSelectionRange(r.inicio, r.fin); });
  }
  function insertar(fragmento) {
    const t = refTexto.current;
    const ini = t?.selectionStart ?? texto.length;
    const fin = t?.selectionEnd ?? texto.length;
    setTexto(`${texto.slice(0, ini)}${fragmento}${texto.slice(fin)}`);
    requestAnimationFrame(() => { t?.focus(); t?.setSelectionRange(ini + fragmento.length, ini + fragmento.length); });
  }

  async function guardarEdicion(idMensaje) {
    if (!textoEditando.trim()) return;
    setGuardandoEdicion(true); setErrorEdicion('');
    try {
      await mensajesService.update(idMensaje, textoEditando);
      setEditando(null);
      await recargar();
    } catch (err) {
      setErrorEdicion(err.response?.data?.message || 'No se pudo guardar la edición');
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function cambiarFijado(m, fijado) {
    setAviso('');
    try { await mensajesService.fijar(m.id_mensaje, fijado); await recargar(); }
    catch (err) { setAviso(err.response?.data?.message || 'No se pudo actualizar el aviso'); }
  }

  function alVotar(idMensaje, encuesta) {
    if (!encuesta) return;
    setMensajes(lista => lista.map(m => (m.id_mensaje === idMensaje ? { ...m, encuesta } : m)));
  }

  const fijados = mensajes.filter(m => m.fijado);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Avisos fijados */}
      {fijados.length > 0 && (
        <section className="avisos-fijados" aria-label="Avisos fijados">
          {fijados.map(m => (
            <div key={m.id_mensaje} className="aviso-fijado">
              <span className="aviso-fijado-icono" aria-hidden="true">📢</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="aviso-fijado-meta">Aviso de {m.remitente_nombre} · {hora(m.fecha_envio)}</div>
                <div className="msg-cuerpo">{renderFormato(m.contenido)}</div>
                {m.firma && <div className="msg-firma">— {m.firma}</div>}
              </div>
              {puedePublicarAvisos && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => cambiarFijado(m, false)}>Desfijar</button>
              )}
            </div>
          ))}
        </section>
      )}
      {aviso && <div className="alert alert-error" role="alert">{aviso}</div>}

      {/* Conversación */}
      <div className="card chat-lista" role="log" aria-label="Mensajes del proyecto" aria-live="polite">
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mensajes.length === 0 && (
            <div className="empty-state"><div className="empty-state-icon">💬</div><h3>Sin mensajes aún</h3><p>Sé el primero en escribir, o abre una encuesta para decidir algo en equipo.</p></div>
          )}
          {mensajes.map(m => {
            const esPropio = m.id_remitente === usuario.id;
            const enEdicion = editando === m.id_mensaje;
            return (
              <div key={m.id_mensaje} className={`msg ${esPropio ? 'propio' : ''}`}>
                <div className="msg-avatar" aria-hidden="true">{(m.remitente_nombre || '?')[0].toUpperCase()}</div>
                <div className="msg-contenido">
                  <div className="msg-meta">
                    {m.remitente_nombre}{m.remitente_rol === 'Instructor' && <span className="msg-rol">Instructor</span>} · {hora(m.fecha_envio)}
                    {m.fecha_edicion && <span title={`Editado: ${new Date(m.fecha_edicion).toLocaleString('es-CO')}`}> · (editado)</span>}
                  </div>
                  {enEdicion ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {errorEdicion && <div className="alert alert-error" role="alert" style={{ fontSize: 11, padding: '6px 10px' }}>{errorEdicion}</div>}
                      <textarea className="form-textarea" style={{ minHeight: 50, fontSize: 13 }} aria-label="Editar mensaje"
                        value={textoEditando} onChange={ev => setTextoEditando(ev.target.value)} autoFocus />
                      <div style={{ display: 'flex', gap: 6, justifyContent: esPropio ? 'flex-end' : 'flex-start' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditando(null)} disabled={guardandoEdicion}>Cancelar</button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => guardarEdicion(m.id_mensaje)} disabled={guardandoEdicion || !textoEditando.trim()}>
                          {guardandoEdicion ? 'Guardando…' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`msg-burbuja ${m.tipo === 'aviso' ? 'aviso' : ''}`}>
                        {m.respuesta_contenido && (
                          <div className="msg-cita">
                            <strong>{m.respuesta_remitente}</strong>
                            <span>{textoPlano(m.respuesta_contenido).slice(0, 140)}</span>
                          </div>
                        )}
                        {m.tipo === 'aviso' && <div className="msg-etiqueta-aviso">📢 Aviso</div>}
                        {m.tipo === 'encuesta'
                          ? <Encuesta mensaje={m} onVotada={alVotar} />
                          : <div className="msg-cuerpo">{renderFormato(m.contenido)}</div>}
                        {m.firma && <div className="msg-firma">— {m.firma}</div>}
                      </div>
                      <div className="msg-acciones">
                        <button type="button" onClick={() => { setRespondiendo(m); refTexto.current?.focus(); }}
                          aria-label={`Responder a ${m.remitente_nombre}`}>↩ Responder</button>
                        {/* Solo el autor puede editar su propio mensaje (no encuestas) */}
                        {esPropio && m.tipo !== 'encuesta' && (
                          <button type="button" onClick={() => { setEditando(m.id_mensaje); setTextoEditando(m.contenido); setErrorEdicion(''); }}>✏️ Editar</button>
                        )}
                        {puedePublicarAvisos && m.tipo !== 'encuesta' && !m.fijado && (
                          <button type="button" onClick={() => cambiarFijado(m, true)}>📌 Fijar</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={refFinal} />
        </div>
      </div>

      {/* Redactor */}
      <form onSubmit={enviar} className="chat-redactor">
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {respondiendo && (
          <div className="msg-cita respondiendo">
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>Respondiendo a {respondiendo.remitente_nombre}</strong>
              <span>{textoPlano(respondiendo.contenido).slice(0, 140)}</span>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRespondiendo(null)} aria-label="Cancelar respuesta">✕</button>
          </div>
        )}
        <div className="chat-herramientas" role="toolbar" aria-label="Formato del mensaje">
          <button type="button" onClick={() => formatear('*')} aria-label="Negrita" title="Negrita (*texto*)"><strong>B</strong></button>
          <button type="button" onClick={() => formatear('_')} aria-label="Cursiva" title="Cursiva (_texto_)"><em>I</em></button>
          <button type="button" onClick={() => formatear('~')} aria-label="Tachado" title="Tachado (~texto~)"><s>S</s></button>
          <button type="button" onClick={() => formatear('`')} aria-label="Código" title="Código (`texto`)"><code>{'</>'}</code></button>
          <button type="button" onClick={() => insertar(texto && !texto.endsWith('\n') ? '\n- ' : '- ')} aria-label="Lista" title="Lista">•≡</button>
          <span className="chat-separador" aria-hidden="true" />
          <button type="button" onClick={() => setVerEmojis(v => !v)} aria-expanded={verEmojis} aria-label="Emojis" title="Emojis">😊</button>
          <button type="button" onClick={() => { setError(''); setModal('encuesta'); }} aria-label="Crear encuesta" title="Encuesta">📊 Encuesta</button>
          <button type="button" onClick={() => setModal('firma')} aria-label="Mi firma" title="Configurar mi firma">✍️ Firma</button>
        </div>
        {verEmojis && (
          <div className="chat-emojis" role="group" aria-label="Insertar emoji">
            {EMOJIS.map(e => <button key={e} type="button" onClick={() => insertar(e)} aria-label={`Insertar ${e}`}>{e}</button>)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea ref={refTexto} className="form-textarea chat-entrada" rows={2} value={texto}
            onChange={ev => setTexto(ev.target.value)}
            onKeyDown={ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); enviar(ev); } }}
            placeholder="Escribe un mensaje…" aria-label="Mensaje" maxLength={5000} />
          <button type="submit" className="btn btn-primary" disabled={!texto.trim() || enviando}>
            {enviando ? 'Enviando…' : comoAviso ? 'Publicar aviso 📢' : 'Enviar ✉️'}
          </button>
        </div>
        <div className="chat-opciones">
          <label>
            <input type="checkbox" checked={incluirFirma && !!firma} disabled={!firma}
              onChange={ev => { setIncluirFirma(ev.target.checked); guardarPreferenciaFirma(ev.target.checked); }} />
            {' '}Agregar mi firma{firma ? '' : ' (configúrala en ✍️ Firma)'}
          </label>
          {puedePublicarAvisos && (
            <label>
              <input type="checkbox" checked={comoAviso} onChange={ev => setComoAviso(ev.target.checked)} />
              {' '}Publicar como aviso fijado
            </label>
          )}
          <span className="chat-ayuda">Enter envía · Shift+Enter nueva línea</span>
        </div>
      </form>

      {modal === 'encuesta' && (
        <EncuestaModal onClose={() => setModal(null)}
          onCrear={async (pregunta, opciones) => {
            const fallo = await publicar(pregunta, { tipo: 'encuesta', opciones });
            if (!fallo) setModal(null);
            return fallo;
          }} />
      )}
      {modal === 'firma' && (
        <FirmaModal inicial={firma} onClose={() => setModal(null)}
          onGuardada={(f) => { setFirma(f); setModal(null); if (f && !incluirFirma) { setIncluirFirma(true); guardarPreferenciaFirma(true); } }} />
      )}
    </div>
  );
}
