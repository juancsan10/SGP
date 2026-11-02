import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SolicitudesPanel from '../src/components/SolicitudesPanel.jsx';
import { equiposService, proyectosService, solicitudesService } from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

vi.mock('../src/services/api.js', () => ({
  solicitudesService: { mias: vi.fn(), tipos: vi.fn(), create: vi.fn(), getAll: vi.fn(), resolver: vi.fn() },
  equiposService: { listSolicitudes: vi.fn(), resolverSolicitud: vi.fn() },
  proyectosService: { getAll: vi.fn() },
}));

const PENDIENTE = {
  id_solicitud: 7, tipo: 'Corrección de datos', estado: 'Pendiente', asunto: 'Corregir mi cédula',
  descripcion: 'Mi número quedó mal escrito', solicitante_nombre: 'Carlos Herrera', solicitante_rol: 'Aprendiz',
};

beforeEach(() => {
  vi.clearAllMocks();
  solicitudesService.mias.mockResolvedValue({ data: { data: [] } });
  solicitudesService.tipos.mockResolvedValue({ data: { data: ['Corrección de datos', 'Soporte técnico'] } });
  proyectosService.getAll.mockResolvedValue({ data: { data: [{ id_proyecto: 1, nombre: 'SGP' }] } });
  solicitudesService.getAll.mockResolvedValue({ data: { data: [PENDIENTE], meta: { total: 1, limit: 5, offset: 0, resumen: { Pendiente: 1, Atendida: 0, Rechazada: 0 } } } });
  equiposService.listSolicitudes.mockResolvedValue({ data: { data: [] } });
});

async function abrirNuevaSolicitud(user) {
  renderConSesion(<SolicitudesPanel esAdmin={false} />, { usuario: { id: 4, rol: 'Aprendiz' } });
  await user.click(screen.getByRole('button', { name: '+ Nueva solicitud' }));
  await screen.findByRole('option', { name: 'Soporte técnico' });
}

describe('SolicitudesPanel (instructor o aprendiz)', () => {
  it('should keep "Enviar solicitud" disabled with a subject of 4 characters', async () => {
    // Arrange
    const user = userEvent.setup();
    await abrirNuevaSolicitud(user);

    // Act: valor límite, el asunto pide mínimo 5
    await user.selectOptions(screen.getByLabelText('Tipo *'), 'Soporte técnico');
    await user.type(screen.getByLabelText('Asunto *'), 'Clav');
    await user.type(screen.getByLabelText('Descripción *'), 'No puedo entrar a mi cuenta');

    // Assert
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();
  });

  it('should send the request without project when "Ninguno" is left selected', async () => {
    solicitudesService.create.mockResolvedValueOnce({ data: { success: true } });
    const user = userEvent.setup();
    await abrirNuevaSolicitud(user);

    await user.selectOptions(screen.getByLabelText('Tipo *'), 'Soporte técnico');
    await user.type(screen.getByLabelText('Asunto *'), 'Clave');
    await user.type(screen.getByLabelText('Descripción *'), 'a'.repeat(10));
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(solicitudesService.create).toHaveBeenCalledWith({ tipo: 'Soporte técnico', asunto: 'Clave', descripcion: 'a'.repeat(10), id_proyecto: undefined });
    expect(await screen.findByText(/Solicitud enviada/)).toBeInTheDocument();
  });

  it('should show the error inside the form when sending fails', async () => {
    solicitudesService.create.mockRejectedValueOnce({ response: { data: { message: 'Ya tienes una solicitud pendiente de este tipo' } } });
    const user = userEvent.setup();
    await abrirNuevaSolicitud(user);

    await user.selectOptions(screen.getByLabelText('Tipo *'), 'Soporte técnico');
    await user.type(screen.getByLabelText('Asunto *'), 'Clave olvidada');
    await user.type(screen.getByLabelText('Descripción *'), 'No me llega el enlace');
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya tienes una solicitud pendiente de este tipo');
    expect(screen.getByLabelText('Asunto *')).toHaveValue('Clave olvidada'); // no se pierde lo escrito
  });
});

describe('SolicitudesPanel (administrador)', () => {
  it('should resolve a pending request with the answer written by the admin', async () => {
    solicitudesService.resolver.mockResolvedValueOnce({ data: { success: true } });
    const user = userEvent.setup();
    renderConSesion(<SolicitudesPanel esAdmin />, { usuario: { id: 1, rol: 'Administrador' } });

    await user.click(await screen.findByRole('button', { name: 'Atender' }));
    await user.type(screen.getByLabelText('Respuesta para el solicitante *'), 'Ya quedó corregida');
    await user.click(screen.getByRole('button', { name: 'Marcar como atendida' }));

    expect(solicitudesService.resolver).toHaveBeenCalledWith(7, 'Atendida', 'Ya quedó corregida');
    expect(await screen.findByText(/el solicitante fue notificado/)).toBeInTheDocument();
  });

  it('should not let the admin reject a request with an answer shorter than 5 characters', async () => {
    const user = userEvent.setup();
    renderConSesion(<SolicitudesPanel esAdmin />, { usuario: { id: 1, rol: 'Administrador' } });

    await user.click(await screen.findByRole('button', { name: 'Rechazar' }));
    await user.type(screen.getByLabelText('Respuesta para el solicitante *'), 'No.');

    expect(screen.getAllByRole('button', { name: 'Rechazar' }).at(-1)).toBeDisabled();
  });

  it('should show the empty state when there are no pending requests', async () => {
    solicitudesService.getAll.mockResolvedValue({ data: { data: [], meta: { total: 0, limit: 5, offset: 0, resumen: { Pendiente: 0, Atendida: 0, Rechazada: 0 } } } });

    renderConSesion(<SolicitudesPanel esAdmin />, { usuario: { id: 1, rol: 'Administrador' } });

    expect(await screen.findByRole('heading', { name: 'No hay solicitudes pendientes' })).toBeInTheDocument();
  });
});
