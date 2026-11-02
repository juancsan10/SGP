import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext.jsx';

// Renderiza un componente con sesión iniciada (o sin sesión si usuario es null)
// dentro del router, igual que en la app real.
export function renderConSesion(ui, { usuario = null, ruta = '/' } = {}) {
  localStorage.clear();
  if (usuario) localStorage.setItem('sgp_usuario', JSON.stringify(usuario));
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>
    </AuthProvider>
  );
}
