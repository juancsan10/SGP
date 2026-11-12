import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NuevoAprendizModal, SolicitudesAprendizAdmin, validarSolicitudAprendiz } from '../src/components/SolicitudesAprendiz.jsx';
import { proyectosService, solicitudesAprendizService } from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

vi.mock('../src/services/api.js', () => ({
  proyectosService: { getAll: vi.fn() },
  solicitudesAprendizService: { crear: vi.fn(), mias: vi.fn(), getAll: vi.fn(), resolver: vi.fn() },
  notificacionesService: { getByUsuario: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}));

const INSTRUCTOR = { id: 2, nombres: 'Laura', rol: 'Instructor' };
const ADMIN = { id: 1, nombres: 'Diana', rol: 'Administrador' };
const COMPLETO = { nombres: 'Sofía', apellidos: 'Martínez', correo: 'sofia@sena.edu.co', identificacion: '1098765999',
  ficha: '3228970', programa_formacion: 'ADSO', id_proyecto: '3', contrasena: 'Sena2026x' };

beforeEach(() => {
  vi.clearAllMocks();
  proyectosService.getAll.mockResolvedValue({ data: { data: [{ id_proyecto: 3, nombre: 'SGP' }] } });
});

describe('validarSolicitudAprendiz', () => {
  it('should accept a request with every field filled', () => {
    expect(validarSolicitudAprendiz(COMPLETO)).toEqual({});
  });

  it('should mark every field as required when the form is empty', () => {
    const vacio = Object.fromEntries(Object.keys(COMPLETO).map(k => [k, '']));
    expect(Object.keys(validarSolicitudAprendiz(vacio)).sort()).toEqual(Object.keys(COMPLETO).sort());
  });
});

describe('NuevoAprendizModal (Instructor)', () => {
  it('should not send the request while required fields are missing', async () => {
    // Arrange
    const user = userEvent.setup();
    renderConSesion(<NuevoAprendizModal abierto onClose={vi.fn()} onEnviada={vi.fn()} />, { usuario: INSTRUCTOR });

    // Act
    await user.click(await screen.findByRole('button', { name: 'Enviar solicitud' }));

    // Assert
    expect(solicitudesAprendizService.crear).not.toHaveBeenCalled();
    expect(screen.getByText('La ficha es obligatoria')).toBeInTheDocument();
    expect(screen.getByLabelText('Ficha *')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should send all the data and preselect the only project', async () => {
    // Arrange
    const user = userEvent.setup();
    const onEnviada = vi.fn();
    solicitudesAprendizService.crear.mockResolvedValue({ data: { message: 'Solicitud enviada' } });
    renderConSesion(<NuevoAprendizModal abierto onClose={vi.fn()} onEnviada={onEnviada} />, { usuario: INSTRUCTOR });
    await screen.findByRole('option', { name: 'SGP' });

    // Act
    await user.type(screen.getByLabelText('Nombres *'), COMPLETO.nombres);
    await user.type(screen.getByLabelText('Apellidos *'), COMPLETO.apellidos);
    await user.type(screen.getByLabelText('Correo electrónico *'), COMPLETO.correo);
    await user.type(screen.getByLabelText('Identificación (cc) *'), '1.098.765.999');
    await user.type(screen.getByLabelText('Ficha *'), COMPLETO.ficha);
    await user.type(screen.getByLabelText('Programa de formación *'), COMPLETO.programa_formacion);
    await user.type(screen.getByLabelText('Contraseña temporal *'), COMPLETO.contrasena);
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    // Assert
    expect(solicitudesAprendizService.crear).toHaveBeenCalledWith({ ...COMPLETO, id_proyecto: 3 });
    expect(onEnviada).toHaveBeenCalledWith('Solicitud enviada');
  });
});

describe('SolicitudesAprendizAdmin', () => {
  const PENDIENTE = { id_solicitud_aprendiz: 11, nombres: 'Sofía', apellidos: 'Martínez', correo: 'sofia@sena.edu.co',
    identificacion: '1098765999', ficha: '3228970', programa_formacion: 'ADSO', proyecto_nombre: 'SGP',
    instructor_nombre: 'Laura Gómez', estado: 'Pendiente', fecha_solicitud: '2026-11-10T10:00:00' };

  it('should approve a pending request with an answer for the instructor', async () => {
    // Arrange
    const user = userEvent.setup();
    solicitudesAprendizService.getAll.mockResolvedValue({ data: { data: [PENDIENTE], meta: { total: 1, limit: 5, offset: 0, resumen: { Pendiente: 1 } } } });
    solicitudesAprendizService.resolver.mockResolvedValue({ data: { message: 'Aprendiz creado y asignado al proyecto' } });
    renderConSesion(<SolicitudesAprendizAdmin />, { usuario: ADMIN });
    const fila = (await screen.findByText('Sofía Martínez')).closest('tr');

    // Act
    await user.click(within(fila).getByRole('button', { name: 'Aprobar' }));
    await user.click(screen.getByRole('button', { name: 'Aprobar y crear' }));

    // Assert
    expect(solicitudesAprendizService.resolver).toHaveBeenCalledWith(11, 'Aprobada', 'Datos verificados. Cuenta creada.');
    expect(await screen.findByText('Aprendiz creado y asignado al proyecto')).toBeInTheDocument();
  });

  it('should require an answer before rejecting', async () => {
    // Arrange
    const user = userEvent.setup();
    solicitudesAprendizService.getAll.mockResolvedValue({ data: { data: [PENDIENTE], meta: { total: 1, limit: 5, offset: 0, resumen: { Pendiente: 1 } } } });
    renderConSesion(<SolicitudesAprendizAdmin />, { usuario: ADMIN });
    const fila = (await screen.findByText('Sofía Martínez')).closest('tr');

    // Act
    await user.click(within(fila).getByRole('button', { name: 'Rechazar' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rechazar' }));

    // Assert
    expect(solicitudesAprendizService.resolver).not.toHaveBeenCalled();
  });
});
