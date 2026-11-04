import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { passwordService } from '../services/api.js';
import './PasswordRecovery.css';

const TTL = 180; // segundos de vida del código (3 min)
const LEN = 6;

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function strength(p) {
  let n = 0;
  if (p.length >= 8) n++;
  if (p.length >= 12) n++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++;
  if (/\d/.test(p)) n++;
  if (/[^A-Za-z0-9]/.test(p)) n++;
  return Math.min(n, 4);
}
const NIVELES = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Excelente'];

export default function PasswordRecovery({ initialEmail = '', onClose, onDone, embedded = false }) {
  const [step, setStep] = useState('email'); // email | code | password | done
  const [correo, setCorreo] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [info, setInfo] = useState('');

  const [digits, setDigits] = useState(Array(LEN).fill(''));
  const inputs = useRef([]);
  const [left, setLeft] = useState(TTL);
  const [cooldown, setCooldown] = useState(0);
  const [locked, setLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const [session, setSession] = useState('');
  const [sessionLeft, setSessionLeft] = useState(0);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const expired = step === 'code' && left <= 0;
  const code = digits.join('');
  const score = useMemo(() => strength(pwd), [pwd]);

  // Temporizador del código
  useEffect(() => {
    if (step !== 'code') return undefined;
    const id = setInterval(() => {
      setLeft((v) => Math.max(v - 1, 0));
      setCooldown((v) => Math.max(v - 1, 0));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  // Temporizador de la sesión de cambio de contraseña
  useEffect(() => {
    if (step !== 'password') return undefined;
    const id = setInterval(() => setSessionLeft((v) => Math.max(v - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step === 'password' && sessionLeft === 0 && session) {
      setError('La sesión de recuperación venció. Empieza de nuevo.');
      setSession('');
    }
  }, [sessionLeft, step, session]);

  useEffect(() => {
    if (step === 'code') setTimeout(() => inputs.current[0]?.focus(), 350);
  }, [step]);

  const fail = useCallback((msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  async function pedirCodigo(e) {
    e?.preventDefault();
    e?.stopPropagation(); // el portal burbujea por el árbol de React hasta el <form> del login
    setError('');
    setInfo('');
    if (!/^\S+@\S+\.\S+$/.test(correo)) return fail('Escribe un correo válido.');
    setBusy(true);
    try {
      const r = await passwordService.request(correo.trim());
      setDigits(Array(LEN).fill(''));
      setLeft(r.data.data?.expires_in || TTL);
      setCooldown(r.data.data?.resend_in || 60);
      setLocked(false);
      setStep('code');
      setInfo(r.data.message);
    } catch (err) {
      const retry = err.response?.data?.data?.retry_after;
      if (retry) { setCooldown(retry); setStep('code'); setLeft((v) => v); }
      fail(err.response?.data?.message || 'No fue posible enviar el código.');
    } finally { setBusy(false); }
  }

  async function verificar(valor) {
    setError('');
    setBusy(true);
    try {
      const r = await passwordService.verify(correo.trim(), valor);
      setSession(r.data.data.reset_session);
      setSessionLeft(r.data.data.session_expires_in);
      setUnlocking(true);
      setTimeout(() => { setStep('password'); setUnlocking(false); }, 900);
    } catch (err) {
      const d = err.response?.data?.data || {};
      if (d.locked || d.expired) setLocked(true);
      fail(err.response?.data?.message || 'No fue posible verificar el código.');
      setDigits(Array(LEN).fill(''));
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } finally { setBusy(false); }
  }

  function onDigit(i, v) {
    const d = v.replace(/\D/g, '');
    if (!d) return;
    const next = [...digits];
    // pegar varios dígitos
    d.split('').slice(0, LEN - i).forEach((ch, k) => { next[i + k] = ch; });
    setDigits(next);
    const last = Math.min(i + d.length, LEN - 1);
    inputs.current[last]?.focus();
    if (next.every(Boolean) && !busy) verificar(next.join(''));
  }
  function onKey(i, e) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) next[i] = '';
      else if (i > 0) { next[i - 1] = ''; inputs.current[i - 1]?.focus(); }
      setDigits(next);
    } else if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < LEN - 1) inputs.current[i + 1]?.focus();
  }
  function onPaste(e) {
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LEN);
    if (!t) return;
    e.preventDefault();
    const next = Array(LEN).fill('');
    t.split('').forEach((c, k) => { next[k] = c; });
    setDigits(next);
    inputs.current[Math.min(t.length, LEN - 1)]?.focus();
    if (t.length === LEN && !busy) verificar(t);
  }

  async function guardar(e) {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    if (!session) return fail('La sesión venció. Empieza de nuevo.');
    if (pwd.length < 8 || !/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) return fail('Mínimo 8 caracteres, con letras y números.');
    if (pwd !== pwd2) return fail('Las contraseñas no coinciden.');
    setBusy(true);
    try {
      await passwordService.confirm(correo.trim(), session, pwd);
      setSession('');
      setStep('done');
      setTimeout(() => onDone?.(correo.trim()), 2600);
    } catch (err) {
      fail(err.response?.data?.message || 'No fue posible actualizar la contraseña.');
    } finally { setBusy(false); }
  }

  const pct = Math.max(left / TTL, 0);
  const R = 34;
  const C = 2 * Math.PI * R;
  const urgente = left <= 30 && left > 0;
  const stepIndex = { email: 0, code: 1, password: 2, done: 3 }[step];

  const view = (
    <div className={`rec ${embedded ? 'rec--embedded' : 'rec--modal'}`} role="dialog" aria-modal={!embedded} aria-label="Recuperar contraseña">
      {!embedded && <div className="rec__backdrop" onClick={onClose} />}
      <div className={`rec__card ${shake ? 'is-shake' : ''}`}>
        {onClose && step !== 'done' && (
          <button type="button" className="rec__close" onClick={onClose} aria-label="Cerrar">×</button>
        )}

        <ol className="rec__steps" aria-label="Progreso">
          {['Correo', 'Código', 'Nueva clave'].map((t, i) => (
            <li key={t} className={i < stepIndex ? 'is-done' : i === stepIndex ? 'is-active' : ''}>
              <span>{i < stepIndex ? '✓' : i + 1}</span>
              <em>{t}</em>
            </li>
          ))}
        </ol>

        <div className="rec__stage" key={step}>
          {step === 'email' && (
            <form onSubmit={pedirCodigo} className="rec__pane" noValidate>
              <div className="rec__icon rec__icon--mail" aria-hidden="true">
                <svg viewBox="0 0 64 64"><rect x="8" y="16" width="48" height="34" rx="6" /><path d="M10 20l22 17 22-17" /></svg>
              </div>
              <h2>Recupera tu acceso</h2>
              <p>Escribe el correo de tu cuenta. Enviaremos un código de 6 dígitos <b>solo a esa dirección</b>; vence en 3 minutos.</p>
              <label className="rec__field">
                <span>Correo electrónico</span>
                <input type="email" autoFocus autoComplete="email" placeholder="correo@sena.edu.co"
                  value={correo} onChange={(e) => setCorreo(e.target.value)} />
              </label>
              <button className="rec__btn" disabled={busy}>{busy ? <i className="rec__spin" /> : 'Enviar código'}</button>
            </form>
          )}

          {step === 'code' && (
            <div className="rec__pane">
              <div className={`rec__icon rec__icon--lock ${unlocking ? 'is-unlocking' : ''}`} aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <path className="shackle" d="M22 28v-7a10 10 0 0 1 20 0v7" />
                  <rect x="14" y="28" width="36" height="26" rx="6" />
                  <circle cx="32" cy="41" r="3.2" />
                </svg>
              </div>
              <h2>Ingresa el código</h2>
              <p>Lo enviamos a <b>{correo}</b>. Si la cuenta existe, llegará en segundos. Revisa también spam.</p>

              <div className="rec__timer" aria-live="polite">
                <svg viewBox="0 0 80 80" className={urgente ? 'is-urgent' : ''}>
                  <circle className="bg" cx="40" cy="40" r={R} />
                  <circle className="fg" cx="40" cy="40" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
                </svg>
                <strong className={urgente ? 'is-urgent' : ''}>{expired ? '0:00' : fmt(left)}</strong>
              </div>

              <div className={`rec__otp ${unlocking ? 'is-ok' : ''}`} onPaste={onPaste}>
                {digits.map((d, i) => (
                  <input key={i} ref={(el) => (inputs.current[i] = el)} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={LEN} value={d} disabled={busy || expired || locked || unlocking}
                    aria-label={`Dígito ${i + 1}`}
                    className={d ? 'is-filled' : ''}
                    onChange={(e) => onDigit(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} />
                ))}
              </div>

              {unlocking && <p className="rec__ok">✓ Código correcto. Desbloqueando…</p>}
              {expired && <p className="rec__error">El código venció. Solicita uno nuevo.</p>}

              <div className="rec__row">
                <button type="button" className="rec__link" disabled={cooldown > 0 || busy} onClick={pedirCodigo}>
                  {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
                </button>
                <button type="button" className="rec__link" onClick={() => { setStep('email'); setError(''); }}>Cambiar correo</button>
              </div>
              <button type="button" className="rec__btn" disabled={busy || code.length < LEN || expired || locked || unlocking} onClick={() => verificar(code)}>
                {busy ? <i className="rec__spin" /> : 'Verificar código'}
              </button>
            </div>
          )}

          {step === 'password' && (
            <form onSubmit={guardar} className="rec__pane" noValidate>
              <div className="rec__icon rec__icon--unlocked" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <path className="shackle" d="M22 28v-7a10 10 0 0 1 20 0" />
                  <rect x="14" y="28" width="36" height="26" rx="6" />
                  <circle cx="32" cy="41" r="3.2" />
                </svg>
              </div>
              <h2>Crea tu nueva contraseña</h2>
              <p>Identidad verificada. Tienes <b>{fmt(sessionLeft)}</b> para completar el cambio.</p>

              <label className="rec__field">
                <span>Nueva contraseña</span>
                <div className="rec__pwd">
                  <input type={showPwd ? 'text' : 'password'} autoFocus autoComplete="new-password" value={pwd}
                    onChange={(e) => setPwd(e.target.value)} placeholder="Mínimo 8 caracteres" disabled={!session} />
                  <button type="button" onClick={() => setShowPwd((v) => !v)} aria-label={showPwd ? 'Ocultar' : 'Mostrar'}>{showPwd ? '🙈' : '👁'}</button>
                </div>
              </label>
              <div className={`rec__meter s${pwd ? score : -1}`} aria-hidden="true">
                <i /><i /><i /><i />
                <small>{pwd ? NIVELES[score] : 'Usa letras, números y símbolos'}</small>
              </div>
              <ul className="rec__rules">
                <li className={pwd.length >= 8 ? 'ok' : ''}>8+ caracteres</li>
                <li className={/[A-Za-z]/.test(pwd) ? 'ok' : ''}>Una letra</li>
                <li className={/\d/.test(pwd) ? 'ok' : ''}>Un número</li>
              </ul>
              <label className="rec__field">
                <span>Confirmar contraseña</span>
                <input type={showPwd ? 'text' : 'password'} autoComplete="new-password" value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)} placeholder="Repite la contraseña" disabled={!session} />
                {pwd2 && <small className={pwd === pwd2 ? 'rec__match ok' : 'rec__match'}>{pwd === pwd2 ? '✓ Coinciden' : 'No coinciden'}</small>}
              </label>
              <button className="rec__btn" disabled={busy || !session}>{busy ? <i className="rec__spin" /> : 'Guardar contraseña'}</button>
              {!session && <button type="button" className="rec__link" onClick={() => { setStep('email'); setError(''); setPwd(''); setPwd2(''); }}>Empezar de nuevo</button>}
            </form>
          )}

          {step === 'done' && (
            <div className="rec__pane rec__pane--done">
              <svg className="rec__check" viewBox="0 0 80 80" aria-hidden="true">
                <circle cx="40" cy="40" r="34" /><path d="M25 41l11 11 20-23" />
              </svg>
              <h2>¡Contraseña actualizada!</h2>
              <p>Ya puedes iniciar sesión con tu nueva contraseña. Te llevamos allí en un momento…</p>
              <button type="button" className="rec__btn" onClick={() => onDone?.(correo.trim())}>Ir a iniciar sesión</button>
              <div className="rec__confetti" aria-hidden="true">{Array.from({ length: 16 }).map((_, i) => <i key={i} style={{ '--i': i }} />)}</div>
            </div>
          )}
        </div>

        {error && <p className="rec__error" role="alert">{error}</p>}
        {info && step === 'code' && !error && <p className="rec__hint">{info}</p>}
        <p className="rec__secure">🔒 Código de un solo uso · hash en base de datos · máx. 5 intentos</p>
      </div>
    </div>
  );
  return embedded ? view : createPortal(view, document.body);
}
