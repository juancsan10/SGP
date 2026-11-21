import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ToastNotificaciones from '../src/components/ToastNotificaciones.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { NotificacionesProvider, useNotificaciones } from '../src/context/NotificacionesContext.jsx';
import { notificacionesService } from '../src/services/api.js';

vi.mock('../src/services/api.js', () => ({
  notificacionesService: {
    getByUsuario: vi.fn(),
    marcarLeida: vi.fn(),
    marcarTodasLeidas: vi.fn(),
  },
}));

// Doble: FAKE del WebSocket del navegador. Guarda cada conexión creada para que el test
// pueda "enviar" mensajes del servidor y cerrar la conexión como lo haría la red.
class WebSocketFalso {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static creados = [];

  constructor(url) {
    this.url = url;
    this.readyState = WebSocketFalso.CONNECTING;
    WebSocketFalso.creados.push(this);
  }

  abrir() {
    this.readyState = WebSocketFalso.OPEN;
    this.onopen?.();
  }

  recibir(mensaje) {
    this.onmessage?.({ data: JSON.stringify(mensaje) });
  }

  close(code = 1000) {
    this.readyState = WebSocketFalso.CLOSED;
    this.onclose?.({ code });
  }
}

const ultimo = () => WebSocketFalso.creados.at(-1);

function Estado() {
  const { noLeidas, conectado } = useNotificaciones();
  return <p>{`${noLeidas} sin leer · ${conectado ? 'en vivo' : 'desconectado'}`}</p>;
}

// Monta la app y espera la carga inicial por REST, para que no pise lo que llegue por el socket
async function montar({ token = 'token.de.prueba' } = {}) {
  localStorage.setItem('sgp_usuario', JSON.stringify({ id: 4, nombres: 'Carlos', rol: 'Aprendiz' }));
  if (token) localStorage.setItem('sgp_token', token);
  render(
    <AuthProvider>
      <NotificacionesProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Estado />
          <ToastNotificaciones />
          <Routes>
            <Route path="/dashboard" element={<h1>Dashboard</h1>} />
            <Route path="/notificaciones" element={<h1>Notificaciones</h1>} />
          </Routes>
        </MemoryRouter>
      </NotificacionesProvider>
    </AuthProvider>,
  );
  await waitFor(() => expect(notificacionesService.getByUsuario).toHaveBeenCalled());
  await act(async () => {});
}

const NOTIFICACION = { id_notificacion: 10, titulo: 'Nueva tarea asignada', mensaje: 'Diseñar el login', tipo: 'tarea', prioridad: 'Alta', leida: 0 };

beforeEach(() => {
  localStorage.clear();
  WebSocketFalso.creados = [];
  vi.stubGlobal('WebSocket', WebSocketFalso);
  notificacionesService.getByUsuario.mockResolvedValue({ data: { data: [] } });
  notificacionesService.marcarLeida.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('notificaciones en tiempo real', () => {
  it('should open the socket with the session token and show that it is live', async () => {
    await montar();
    expect(ultimo().url).toBe('ws://localhost:3000/ws?token=token.de.prueba');

    act(() => ultimo().abrir());

    expect(await screen.findByText('0 sin leer · en vivo')).toBeInTheDocument();
  });

  it('should not open any socket without a token', async () => {
    await montar({ token: null });

    await waitFor(() => expect(notificacionesService.getByUsuario).toHaveBeenCalledWith(4));
    expect(WebSocketFalso.creados).toHaveLength(0);
  });

  it('should show a toast and count it as unread when a notification arrives, only once per id', async () => {
    await montar();
    act(() => ultimo().abrir());

    act(() => ultimo().recibir({ type: 'NUEVA_NOTIFICACION', data: NOTIFICACION }));
    act(() => ultimo().recibir({ type: 'NUEVA_NOTIFICACION', data: NOTIFICACION })); // repetida

    expect(screen.getByText('1 sin leer · en vivo')).toBeInTheDocument();
    expect(screen.getAllByText('Nueva tarea asignada')).toHaveLength(2); // dos toasts, una sola notificación en la lista
  });

  it('should update the counter when the server says it was read, or that all were read', async () => {
    notificacionesService.getByUsuario.mockResolvedValue({ data: { data: [
      { id_notificacion: 1, leida: 0 }, { id_notificacion: 2, leida: 0 }, { id_notificacion: 3, leida: 0 },
    ] } });
    await montar();
    await screen.findByText(/3 sin leer/);

    act(() => ultimo().recibir({ type: 'NOTIFICACION_LEIDA', data: { id_notificacion: 2 } }));
    expect(screen.getByText(/2 sin leer/)).toBeInTheDocument();

    act(() => ultimo().recibir({ type: 'TODAS_LEIDAS' }));
    expect(screen.getByText(/0 sin leer/)).toBeInTheDocument();
  });

  it('should close the toast by itself after 6 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await montar();
    act(() => ultimo().recibir({ type: 'NUEVA_NOTIFICACION', data: NOTIFICACION }));
    expect(screen.getByText('Diseñar el login')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(6000));

    expect(screen.queryByText('Diseñar el login')).not.toBeInTheDocument();
  });

  it('should mark it as read and go to /notificaciones from "Ver notificación"', async () => {
    const user = userEvent.setup();
    await montar();
    act(() => ultimo().recibir({ type: 'NUEVA_NOTIFICACION', data: NOTIFICACION }));

    await user.click(screen.getByRole('button', { name: 'Ver notificación' }));

    expect(notificacionesService.marcarLeida).toHaveBeenCalledWith(10);
    expect(await screen.findByRole('heading', { name: 'Notificaciones' })).toBeInTheDocument();
    expect(screen.queryByText('Diseñar el login')).not.toBeInTheDocument();
  });

  it('should close only the toast with "Cerrar notificación"', async () => {
    const user = userEvent.setup();
    await montar();
    act(() => ultimo().recibir({ type: 'NUEVA_NOTIFICACION', data: NOTIFICACION }));

    await user.click(screen.getByRole('button', { name: 'Cerrar notificación' }));

    expect(screen.queryByText('Diseñar el login')).not.toBeInTheDocument();
    expect(notificacionesService.marcarLeida).not.toHaveBeenCalled();
    expect(screen.getByText(/1 sin leer/)).toBeInTheDocument();
  });

  it('should reconnect after an unexpected close, but not after a normal one', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await montar();
    act(() => ultimo().abrir());

    act(() => ultimo().close(1006)); // la red se cayó
    expect(screen.getByText(/desconectado/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000)); // primer reintento: 1 s
    expect(WebSocketFalso.creados).toHaveLength(2);

    act(() => ultimo().close(1000)); // cierre normal
    act(() => vi.advanceTimersByTime(20000));
    expect(WebSocketFalso.creados).toHaveLength(2);
  });
});
