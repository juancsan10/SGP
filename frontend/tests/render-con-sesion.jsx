import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { NotificacionesProvider } from '../src/context/NotificacionesContext.jsx';

// Renderiza un componente con sesión iniciada (o sin sesión si usuario es null)
// dentro del router y de los proveedores globales, igual que en main.jsx.
// No se guarda sgp_token, así que el contexto de notificaciones no abre el WebSocket.
export function renderConSesion(ui, { usuario = null, ruta = '/' } = {}) {
  localStorage.clear();
  if (usuario) localStorage.setItem('sgp_usuario', JSON.stringify(usuario));
  return render(
    <AuthProvider>
      <NotificacionesProvider>
        <MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>
      </NotificacionesProvider>
    </AuthProvider>
  );
}
