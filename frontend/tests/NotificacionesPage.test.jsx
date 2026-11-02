import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificacionesPage from '../src/pages/NotificacionesPage.jsx';
import { notificacionesService } from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

vi.mock('../src/services/api.js', () => ({
  notificacionesService: {
    getByUsuario: vi.fn(), getEnviadas: vi.fn(), marcarLeida: vi.fn(), marcarTodasLeidas: vi.fn(), broadcast: vi.fn(),
  },
}));

const APRENDIZ = { id: 4, nombres: 'Carlos', rol: 'Aprendiz' };
const ADMIN = { id: 1, nombres: 'Rubiel', rol: 'Administrador' };
const NOTIFICACIONES = [
  { id_notificacion: 10, titulo: 'Nueva tarea asignada', tipo: 'tarea', leida: 0, fecha_envio: '2026-10-20T15:00:00Z' },
  { id_notificacion: 11, titulo: 'Entrega aprobada', tipo: 'entrega', leida: 1, fecha_envio: '2026-10-19T15:00:00Z' },
];

beforeEach(() => {
  vi.clearAllMocks();
  notificacionesService.getByUsuario.mockResolvedValue({ data: { data: NOTIFICACIONES } });
});

describe('NotificacionesPage', () => {
  it('should load the notifications of the logged user', async () => {
    renderConSesion(<NotificacionesPage />, { usuario: APRENDIZ });

    expect(await screen.findByText('Nueva tarea asignada')).toBeInTheDocument();
    expect(notificacionesService.getByUsuario).toHaveBeenCalledWith(4);
  });

  it('should mark a notification as read when the button is clicked', async () => {
    // Arrange
    notificacionesService.marcarLeida.mockResolvedValueOnce({});
    renderConSesion(<NotificacionesPage />, { usuario: APRENDIZ });
    await screen.findByText('Nueva tarea asignada');

    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Marcar leída' }));

    // Assert
    expect(notificacionesService.marcarLeida).toHaveBeenCalledWith(10);
    expect(screen.queryByRole('button', { name: 'Marcar leída' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Leída')).toHaveLength(2);
  });

  it('should show an error when marking as read fails', async () => {
    notificacionesService.marcarLeida.mockRejectedValueOnce({ response: { data: { message: 'Solo puedes gestionar tus propias notificaciones' } } });
    renderConSesion(<NotificacionesPage />, { usuario: APRENDIZ });
    await screen.findByText('Nueva tarea asignada');

    await userEvent.click(screen.getByRole('button', { name: 'Marcar leída' }));

    expect(await screen.findByText('Solo puedes gestionar tus propias notificaciones')).toBeInTheDocument();
  });

  it('should only let the administrator create notifications', async () => {
    const { unmount } = renderConSesion(<NotificacionesPage />, { usuario: APRENDIZ });
    await screen.findByText('Nueva tarea asignada');
    expect(screen.queryByRole('button', { name: '+ Nueva notificación' })).not.toBeInTheDocument();
    unmount();

    renderConSesion(<NotificacionesPage />, { usuario: ADMIN });

    const encabezado = await screen.findByRole('button', { name: '+ Nueva notificación' });
    expect(within(encabezado.parentElement).getByRole('button', { name: /Marcar todas como leídas/ })).toBeInTheDocument();
  });
});
