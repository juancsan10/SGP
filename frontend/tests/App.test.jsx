import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';
import { renderConSesion } from './render-con-sesion.jsx';

// Stub de todo el cliente HTTP: cada función de cada servicio responde una lista vacía
vi.mock('../src/services/api.js', async (importOriginal) => {
  const real = await importOriginal();
  const vacio = () => Promise.resolve({ data: { data: [], meta: { total: 0, limit: 10, offset: 0 } } });
  const stubs = {};
  for (const [nombre, servicio] of Object.entries(real)) {
    if (nombre === 'default') continue;
    stubs[nombre] = Object.fromEntries(Object.keys(servicio).map((funcion) => [funcion, vi.fn(vacio)]));
  }
  return stubs;
});

const APRENDIZ = { id: 4, nombres: 'Carlos', apellidos: 'Herrera', rol: 'Aprendiz' };
const INSTRUCTOR = { id: 2, nombres: 'Laura', apellidos: 'Gómez', rol: 'Instructor' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('App routes', () => {
  it('should send to the login a visitor without session', async () => {
    renderConSesion(<App />, { ruta: '/proyectos' });

    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
  });

  it('should redirect an apprentice who opens /usuarios to the dashboard', async () => {
    renderConSesion(<App />, { usuario: APRENDIZ, ruta: '/usuarios' });

    expect(await screen.findByRole('heading', { name: /Hola, Carlos/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Usuarios' })).not.toBeInTheDocument();
  });

  it('should let an instructor open /usuarios', async () => {
    renderConSesion(<App />, { usuario: INSTRUCTOR, ruta: '/usuarios' });

    expect(await screen.findByRole('heading', { name: 'Usuarios' })).toBeInTheDocument();
  });
});
