import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import AppLayout from '../src/components/AppLayout.jsx';
import { renderConSesion } from './render-con-sesion.jsx';

const INSTRUCTOR = { id: 2, nombres: 'Laura', apellidos: 'Gómez', rol: 'Instructor' };

function renderLayout(usuario = INSTRUCTOR) {
  return renderConSesion(
    <Routes>
      <Route path="/login" element={<h1>Pantalla de login</h1>} />
      <Route path="/*" element={<AppLayout />}>
        <Route path="dashboard" element={<h1>Inicio</h1>} />
      </Route>
    </Routes>,
    { usuario, ruta: '/dashboard' },
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('AppLayout', () => {
  it('should show the initials, name and role of the logged user', () => {
    renderLayout();

    expect(screen.getByText('LG')).toBeInTheDocument();
    expect(screen.getByText('Instructor')).toBeInTheDocument();
  });

  it('should ask for confirmation before closing the session', async () => {
    // Arrange
    const user = userEvent.setup();
    renderLayout();

    // Act
    await user.click(screen.getByRole('button', { name: /Cerrar sesión/ }));

    // Assert: todavía hay sesión hasta confirmar
    expect(screen.getByRole('heading', { name: '¿Cerrar sesión?' })).toBeInTheDocument();
    expect(localStorage.getItem('sgp_usuario')).not.toBeNull();
  });

  it('should clear the session and go to the login after confirming', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: /Cerrar sesión/ }));
    await user.click(screen.getByRole('button', { name: 'Sí, cerrar sesión' }));

    expect(screen.getByRole('heading', { name: 'Pantalla de login' })).toBeInTheDocument();
    expect(localStorage.getItem('sgp_usuario')).toBeNull();
  });

  it('should remember the collapsed menu in this browser', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Contraer menú' }));

    expect(screen.getByRole('button', { name: 'Expandir menú' })).toHaveAttribute('aria-expanded', 'false');
    expect(localStorage.getItem('sgp_sidebar_contraido')).toBe('1');
  });
});
