// =====================================================
// pages/LoginPage.jsx
// Pantalla de inicio de sesión — identidad "Bitácora de Taller"
// con escena de personajes cinéticos (ojos que siguen el cursor
// y reaccionan al formulario) y sello de ingreso.
// =====================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { authService, passwordService } from '../services/api.js';
import Character from '../components/characters/Character.jsx';
import './LoginPage.css';

const LAST_EMAIL_KEY = 'sgp_last_email';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [correo, setCorreo] = useState(() => localStorage.getItem(LAST_EMAIL_KEY) || '');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(LAST_EMAIL_KEY)));
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | stamping | error
  const [mounted, setMounted] = useState(false);
  const [reaction, setReaction] = useState('idle'); // idle | typing | side | closed | surprise | happy
  const [tilted, setTilted] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function reactSurprise(message) {
    setReaction('surprise');
    setTilted(true);
    if (message) setError(message);
    setTimeout(() => {
      setReaction('idle');
      setTilted(false);
    }, 1600);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === 'stamping') return;
    setError('');

    if (!correo.trim() || !contrasena.trim()) {
      reactSurprise('Completa correo y contraseña.');
      return;
    }

    setStatus('stamping');

    try {
      const res = await authService.login({ correo, contrasena });
      const { token, usuario } = res.data.data;

      if (remember) {
        localStorage.setItem(LAST_EMAIL_KEY, correo);
      } else {
        localStorage.removeItem(LAST_EMAIL_KEY);
      }

      login(token, usuario);
      setReaction('happy');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      setStatus('idle');
      reactSurprise(err.response?.data?.message || 'Error al iniciar sesión');
    }
  }

  async function handleResetRequest(e) {
    e.preventDefault();
    setResetMsg('');
    try {
      const r = await passwordService.request(correo);
      setResetMsg(r.data.data?.reset_url ? `Enlace: ${r.data.data.reset_url}` : r.data.message);
    } catch (err) {
      setResetMsg(err.response?.data?.message || 'No fue posible generar el enlace');
    }
  }

  return (
    <div className={`sgp-login ${mounted ? 'is-mounted' : ''}`}>
      <section className="sgp-login__hero">
        <div className="sgp-login__grid" aria-hidden="true" />

        <div className="sgp-login__hero-content">
          <div className="sgp-login__mark">
            <span className="sgp-login__mark-glyph">SGP</span>
          </div>
          <h1 className="sgp-login__headline">Abre tu bitácora de proyecto</h1>
          <p className="sgp-login__subhead">
            Cada fase, tarea y entrega queda registrada en un solo lugar, con su
            avance y su historia completa, para que el trabajo de convertir una
            idea en un proyecto real —del primer boceto a la entrega final—
            quede documentado tal como se lo merece.
          </p>

          <ul className="sgp-login__highlights">
            <li>
              <span className="sgp-login__highlight-dot sgp-login__highlight-dot--deep" />
              Fases, tareas y entregas en un solo tablero
            </li>
            <li>
              <span className="sgp-login__highlight-dot sgp-login__highlight-dot--sena" />
              Comentarios y archivos por cada avance
            </li>
            <li>
              <span className="sgp-login__highlight-dot sgp-login__highlight-dot--mint" />
              Historial completo, sin perder ni un detalle
            </li>
          </ul>
        </div>

        <div className="sgp-login__scene" aria-hidden="true">
          <div className="sgp-login__scene-inner">
            <div className="sgp-login__scene-figure sgp-login__scene-figure--tower">
              <Character reaction={reaction} variant="tower" tone="deep" tilted={tilted} delay={0} />
            </div>
            <div className="sgp-login__scene-figure sgp-login__scene-figure--block">
              <Character reaction={reaction} variant="block" tone="sena" tilted={tilted} delay={120} />
            </div>
            <div className="sgp-login__scene-figure sgp-login__scene-figure--dome">
              <Character reaction={reaction} variant="dome" tone="mint" tilted={tilted} delay={220} />
            </div>
            <div className="sgp-login__scene-figure sgp-login__scene-figure--capsule">
              <Character reaction={reaction} variant="capsule" tone="moss" tilted={tilted} delay={80} />
            </div>

            <div className="sgp-login__chip sgp-login__chip--a">
              <span className="sgp-login__chip-dot sgp-login__chip-dot--deep" />
              Fase 3 en curso
            </div>
            <div className="sgp-login__chip sgp-login__chip--b">
              <span className="sgp-login__chip-dot sgp-login__chip-dot--sena" />
              Entrega aprobada
            </div>
            <div className="sgp-login__chip sgp-login__chip--c">
              <span className="sgp-login__chip-dot sgp-login__chip-dot--mint" />
              Nuevo comentario
            </div>
          </div>
        </div>

        <ul className="sgp-login__roles" aria-label="Perfiles disponibles">
          <li>Aprendiz</li>
          <li>Instructor</li>
          <li>Administrador</li>
        </ul>

        <p className="sgp-login__hero-foot">SENA · Análisis y Desarrollo de Software</p>
      </section>

      <section className="sgp-login__panel">
        <form
          className={`sgp-login__card ${status === 'error' || error ? 'has-error' : ''}`}
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="sgp-login__card-head">
            <h2>Bienvenido de vuelta</h2>
            <p>Ingresa con tu correo institucional para continuar tu bitácora.</p>
          </div>

          <label className="sgp-field">
            <span className="sgp-field__label">Correo electrónico</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="correo@sena.edu.co"
              value={correo}
              onChange={(e) => { setCorreo(e.target.value); setError(''); }}
              onFocus={() => setReaction('typing')}
              onBlur={() => setReaction((r) => (r === 'typing' ? 'idle' : r))}
              autoFocus
            />
          </label>

          <label className="sgp-field">
            <span className="sgp-field__label">Contraseña</span>
            <div
              className="sgp-field__row"
              onMouseEnter={() => setReaction((r) => (r === 'closed' ? r : 'side'))}
              onMouseLeave={() => setReaction((r) => (r === 'side' ? 'idle' : r))}
            >
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => { setContrasena(e.target.value); setError(''); }}
                onFocus={() => setReaction('closed')}
                onBlur={() => setReaction((r) => (r === 'closed' ? 'idle' : r))}
              />
              <button
                type="button"
                className="sgp-field__toggle"
                onClick={() => { setShowPassword((v) => !v); setReaction('closed'); }}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>

          <div className="sgp-login__row">
            <label className="sgp-checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Recuérdame</span>
            </label>
            <button
              type="button"
              className="sgp-login__link"
              onClick={() => setResetOpen((v) => !v)}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {resetOpen && (
            <div className="sgp-login__reset">
              <p>Te enviamos un enlace de recuperación a tu correo.</p>
              <div className="sgp-login__reset-row">
                <input
                  type="email"
                  placeholder="Tu correo"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                />
                <button type="button" onClick={handleResetRequest}>
                  Generar enlace
                </button>
              </div>
              {resetMsg && <small>{resetMsg}</small>}
            </div>
          )}

          {error && (
            <p className="sgp-login__form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="sgp-login__submit" disabled={status === 'stamping'}>
            <span className={`sgp-stamp ${status === 'stamping' || reaction === 'happy' ? 'is-stamping' : ''}`}>
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="27" className="sgp-stamp__ring" />
                <path
                  d="M20 33.5 27.5 41 44 24"
                  className="sgp-stamp__check"
                  fill="none"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="sgp-login__submit-label">
              {status === 'stamping' ? 'Sellando ingreso…' : reaction === 'happy' ? '¡Bienvenido!' : 'Ingresar'}
            </span>
          </button>

          <details className="sgp-login__demo">
            <summary>📌 Cuentas de demo</summary>
            <div className="sgp-login__demo-row"><span>Admin</span><code>diana.rios@sgpsena.local</code></div>
            <div className="sgp-login__demo-row"><span>Instructor</span><code>laura.gomez@sgpsena.local</code></div>
            <div className="sgp-login__demo-row"><span>Aprendiz</span><code>carlos.herrera@sgpsena.local</code></div>
            <div className="sgp-login__demo-row"><span>Contraseña</span><code>Sena2026*</code></div>
          </details>
        </form>

        <p className="sgp-login__panel-foot">
          ¿Problemas para ingresar? Escríbele a tu instructor o al soporte del centro.
        </p>
      </section>
    </div>
  );
}
