// =====================================================
// components/AppLayout.jsx
// Layout principal: sidebar + área de contenido
// NUEVO: el sidebar se puede contraer (solo íconos) con el botón «/»,
// y "Cerrar sesión" pide confirmación antes de salir.
// =====================================================
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ConfirmModal } from './helpers.jsx';

// La preferencia de contraído/expandido se recuerda en este navegador.
const CLAVE_SIDEBAR = 'sgp_sidebar_contraido';
function leerContraido() {
  try { return localStorage.getItem(CLAVE_SIDEBAR) === '1'; } catch { return false; }
}
function guardarContraido(valor) {
  try { localStorage.setItem(CLAVE_SIDEBAR, valor ? '1' : '0'); } catch { /* almacenamiento no disponible */ }
}

// Definición de ítems del menú
function getNavItems(esAdmin, esInstructor) {
  const items = [
    { label: 'Principal', section: true },
    { path: '/dashboard',      icon: '🏠', label: 'Inicio' },
    { path: '/proyectos',      icon: '📁', label: 'Proyectos' },
    { path: '/tareas',         icon: '✅', label: 'Mis Tareas' },
    { path: '/entregas',       icon: '📤', label: 'Entregas' },
    { path: '/notificaciones', icon: '🔔', label: 'Notificaciones' },
    { path: '/calendario', icon: '🗓️', label: 'Calendario' },
    { path: '/timeline', icon: '📈', label: 'Línea de tiempo' },
  ];

  if (esAdmin || esInstructor) {
    items.push({ label: 'Administración', section: true });
    items.push({ path: '/reportes',  icon: '📊', label: 'Reportes' }); // HU-35: Exportación de reportes
    items.push({ path: '/usuarios',  icon: '👥', label: 'Usuarios' });
    items.push({ path: '/historial', icon: '📋', label: 'Historial' });
  }

  return items;
}

export default function AppLayout() {
  const { usuario, logout, esAdmin, esInstructor, rolClase } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const navItems  = getNavItems(esAdmin, esInstructor);
  const [contraido, setContraido] = useState(leerContraido);
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  function alternarSidebar() {
    setContraido(c => { guardarContraido(!c); return !c; });
  }

  // Iniciales del usuario para el avatar
  const initials = usuario
    ? `${usuario.nombres?.[0] ?? ''}${usuario.apellidos?.[0] ?? ''}`.toUpperCase()
    : '?';

  function handleLogout() {
    setConfirmarSalida(false);
    logout();
    navigate('/login');
  }

  return (
    <div className={`app-layout ${rolClase} ${contraido ? 'sidebar-contraido' : ''}`}>
      {/* ── Sidebar ───────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo + botón para contraer/expandir */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <div className="sidebar-brand-icon">S</div>
            <div className="sidebar-brand-text">
              <h2>SGP SENA</h2>
              <span>Gestión de Proyectos</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={alternarSidebar}
            title={contraido ? 'Expandir menú' : 'Contraer menú'}
            aria-label={contraido ? 'Expandir menú' : 'Contraer menú'}
            aria-expanded={!contraido}
          >
            {contraido ? '»' : '«'}
          </button>
        </div>

        {/* Navegación */}
        <nav className="sidebar-nav">
          {navItems.map((item, i) =>
            item.section ? (
              <div key={i} className="nav-section-label">{item.label}</div>
            ) : (
              <button
                key={item.path}
                className={`nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                title={contraido ? item.label : undefined}
              >
                <span className="icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            )
          )}
        </nav>

        {/* Usuario + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user" title={contraido ? `${usuario?.nombres ?? ''} ${usuario?.apellidos ?? ''} · ${usuario?.rol ?? ''}` : undefined}>
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{usuario?.nombres} {usuario?.apellidos}</div>
              <div className="sidebar-user-role">{usuario?.rol}</div>
            </div>
          </div>
          <button
            className="nav-link"
            onClick={() => setConfirmarSalida(true)}
            style={{ marginTop: 4 }}
            title={contraido ? 'Cerrar sesión' : undefined}
          >
            <span className="icon">🚪</span>
            <span className="nav-label">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Contenido ─────────────────────────────── */}
      <main className="main-content">
        {/* NUEVO: la "key" reinicia la animación de entrada en cada cambio de ruta */}
        <div key={location.pathname} className="route-transition">
          <Outlet />
        </div>
      </main>

      {/* NUEVO: confirmación antes de cerrar sesión */}
      <ConfirmModal
        abierto={confirmarSalida}
        tipo="advertencia"
        titulo="¿Cerrar sesión?"
        mensaje="Tendrás que volver a ingresar tu correo y contraseña para continuar."
        textoConfirmar="Sí, cerrar sesión"
        textoCancelar="Cancelar"
        onConfirmar={handleLogout}
        onCancelar={() => setConfirmarSalida(false)}
      />
    </div>
  );
}
