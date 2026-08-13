// =====================================================
// App.jsx – Árbol de rutas principal
// =====================================================
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

// Páginas
import LoginPage          from './pages/LoginPage.jsx';
import DashboardPage      from './pages/DashboardPage.jsx';
import ProyectosPage      from './pages/ProyectosPage.jsx';
import ProyectoDetallePage from './pages/ProyectoDetallePage.jsx';
import UsuariosPage       from './pages/UsuariosPage.jsx';
import TareasPage         from './pages/TareasPage.jsx';
import NotificacionesPage from './pages/NotificacionesPage.jsx';
import HistorialPage      from './pages/HistorialPage.jsx';

// Layout
import AppLayout from './components/AppLayout.jsx';

// ── Ruta protegida (requiere sesión activa) ───────────
function PrivateRoute({ children }) {
  const { usuario } = useAuth();
  return usuario ? children : <Navigate to="/login" replace />;
}

// ── Ruta de sólo admin/instructor ────────────────────
function AdminRoute({ children }) {
  const { esAdmin, esInstructor } = useAuth();
  return (esAdmin || esInstructor) ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Privadas – dentro del layout principal */}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index                 element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"      element={<DashboardPage />} />
        <Route path="proyectos"      element={<ProyectosPage />} />
        <Route path="proyectos/:id"  element={<ProyectoDetallePage />} />
        <Route path="tareas"         element={<TareasPage />} />
        <Route path="notificaciones" element={<NotificacionesPage />} />
        <Route path="historial"      element={
          <AdminRoute><HistorialPage /></AdminRoute>
        } />
        <Route path="usuarios"       element={
          <AdminRoute><UsuariosPage /></AdminRoute>
        } />
        {/* Redirección 404 interna */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
