// =====================================================
// pages/LoginPage.jsx
// Pantalla de inicio de sesión
// =====================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { authService, passwordService } from '../services/api.js';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]       = useState({ correo: '', contrasena: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await authService.login(form);
      const { token, usuario } = res.data.data;
      login(token, usuario);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Encabezado */}
        <div style={styles.header}>
          <div style={styles.icon}>🎓</div>
          <h1 style={styles.title}>SGP SENA</h1>
          <p style={styles.subtitle}>Sistema de Gestión de Proyectos</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input
              className="form-input"
              type="email"
              name="correo"
              placeholder="correo@sena.edu.co"
              value={form.correo}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="form-input"
              type="password"
              name="contrasena"
              placeholder="••••••••"
              value={form.contrasena}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            disabled={loading}
          >
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Ayuda rápida con credenciales de prueba */}
        <button type="button" className="btn btn-ghost" style={{width:'100%',marginTop:8}} onClick={()=>setResetOpen(v=>!v)}>¿Olvidaste tu contraseña?</button>
        {resetOpen && <form onSubmit={async(e)=>{e.preventDefault();setResetMsg('');try{const r=await passwordService.request(form.correo);setResetMsg(r.data.data?.reset_url ? `Enlace: ${r.data.data.reset_url}` : r.data.message);}catch(err){setResetMsg(err.response?.data?.message||'No fue posible generar el enlace');}}} style={{marginTop:12,display:'flex',flexDirection:'column',gap:8}}>
          <input className="form-input" type="email" placeholder="Tu correo" value={form.correo} onChange={e=>setForm({...form,correo:e.target.value})} required/>
          <button className="btn btn-secondary" type="submit">Generar enlace</button>
          {resetMsg && <small style={{wordBreak:'break-word'}}>{resetMsg}</small>}
        </form>}

        <div style={styles.hint}>
          <strong>Cuentas de demo (BD de ejemplo):</strong><br />
          Admin: juan@mail.com · Instructor: maria@mail.com<br />
          Contraseña (sin hash): 123
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  card: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    padding: '36px 32px',
    width: '100%', maxWidth: 400,
  },
  header: {
    textAlign: 'center', marginBottom: 28,
  },
  icon: {
    fontSize: 44, lineHeight: 1, marginBottom: 10,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 26, fontWeight: 800, color: 'var(--slate-900)',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13, color: 'var(--slate-500)',
  },
  form: {
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  hint: {
    marginTop: 20, padding: '10px 14px',
    background: 'var(--slate-50)',
    border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 11, color: 'var(--slate-500)',
    lineHeight: 1.6,
  },
};
