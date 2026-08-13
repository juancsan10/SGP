// =====================================================
// components/AppLayout.jsx
// Layout principal: sidebar + área de contenido
// =====================================================
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Definición de ítems del menú
function getNavItems(esAdmin, esInstructor) {
  const items = [
    { label: 'Principal', section: true },
    { path: '/dashboard',      icon: '🏠', label: 'Inicio' },
    { path: '/proyectos',      icon: '📁', label: 'Proyectos' },
    { path: '/tareas',         icon: '✅', label: 'Mis Tareas' },
    { path: '/notificaciones', icon: '🔔', label: 'Notificaciones' },
  ];

  if (esAdmin || esInstructor) {
    items.push({ label: 'Administración', section: true });
    items.push({ path: '/usuarios',  icon: '👥', label: 'Usuarios' });
    items.push({ path: '/historial', icon: '📋', label: 'Historial' });
  }

  return items;
}

export default function AppLayout() {
  const { usuario, logout, esAdmin, esInstructor } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const navItems  = getNavItems(esAdmin, esInstructor);

  // Iniciales del usuario para el avatar
  const initials = usuario
    ? `${usuario.nombres?.[0] ?? ''}${usuario.apellidos?.[0] ?? ''}`.toUpperCase()
    : '?';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-layout">
      {/* ── Sidebar ───────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <div className="sidebar-brand-icon">🎓</div>
            <div className="sidebar-brand-text">
              <h2>SGP SENA</h2>
              <span>Gestión de Proyectos</span>
            </div>
          </div>
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
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </button>
            )
          )}
        </nav>

        {/* Usuario + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{usuario?.nombres} {usuario?.apellidos}</div>
              <div className="sidebar-user-role">{usuario?.rol}</div>
            </div>
          </div>
          <button
            className="nav-link"
            onClick={handleLogout}
            style={{ marginTop: 4 }}
          >
            <span className="icon">🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido ─────────────────────────────── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
