import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EliminarUsuarioModal from '../src/components/EliminarUsuarioModal.jsx';
import { usuariosService } from '../src/services/api.js';

vi.mock('../src/services/api.js', () => ({
  usuariosService: { impactoEliminacion: vi.fn(), eliminarConJustificacion: vi.fn() },
}));

const USUARIO = { id_usuario: 9, nombres: 'Laura', apellidos: 'Gómez' };

// Lo que responde el backend en GET /usuarios/:id/impacto-eliminacion
function impacto({ proyectos = 0, instructores = [{ id_usuario: 3, nombre: 'Miguel Torres', identificacion: '79111222' }] } = {}) {
  return {
    data: {
      data: {
        usuario: { nombres: 'Laura', apellidos: 'Gómez', rol: 'Instructor', identificacion: '52123456', correo: 'laura@sgpsena.local' },
        impacto: { proyectos, tareas: 0, mensajes: 4 },
        motivos: ['Retiro voluntario', 'Duplicado'],
        instructoresDisponibles: instructores,
      },
    },
  };
}

function abrirModal(props = {}) {
  const onEliminado = vi.fn();
  render(<EliminarUsuarioModal usuario={USUARIO} onClose={vi.fn()} onEliminado={onEliminado} {...props} />);
  return { onEliminado };
}

async function llenarCuestionario(user, descripcion) {
  await user.selectOptions(await screen.findByLabelText('1. ¿Por qué se elimina este usuario? *'), 'Retiro voluntario');
  await user.type(screen.getByLabelText('2. Describe la situación *'), descripcion);
  await user.click(screen.getByRole('checkbox', { name: /la eliminación es definitiva/ }));
}

const botonEliminar = () => screen.getByRole('button', { name: /Eliminar definitivamente/ });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EliminarUsuarioModal', () => {
  it('should keep the delete button disabled with a description of 19 characters', async () => {
    // Arrange
    usuariosService.impactoEliminacion.mockResolvedValueOnce(impacto());
    const user = userEvent.setup();
    abrirModal();

    // Act: valor límite, un carácter menos que el mínimo (20)
    await llenarCuestionario(user, 'a'.repeat(19));

    // Assert
    expect(botonEliminar()).toBeDisabled();
  });

  it('should send the questionnaire when the description has exactly 20 characters', async () => {
    usuariosService.impactoEliminacion.mockResolvedValueOnce(impacto());
    usuariosService.eliminarConJustificacion.mockResolvedValueOnce({ data: { message: 'Usuario eliminado' } });
    const user = userEvent.setup();
    const { onEliminado } = abrirModal();

    await llenarCuestionario(user, 'a'.repeat(20));
    await user.click(botonEliminar());

    expect(usuariosService.eliminarConJustificacion).toHaveBeenCalledWith(9, expect.objectContaining({
      motivo: 'Retiro voluntario', descripcion: 'a'.repeat(20), id_instructor_reemplazo: undefined,
    }));
    expect(onEliminado).toHaveBeenCalledWith('Usuario eliminado');
  });

  it('should require a replacement instructor when the user leads projects', async () => {
    usuariosService.impactoEliminacion.mockResolvedValueOnce(impacto({ proyectos: 2 }));
    usuariosService.eliminarConJustificacion.mockResolvedValueOnce({ data: { message: 'ok' } });
    const user = userEvent.setup();
    abrirModal();

    await llenarCuestionario(user, 'Se retiró del centro de formación');
    expect(botonEliminar()).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/se reasignan sus 2 proyecto/), '3');
    await user.click(botonEliminar());

    expect(usuariosService.eliminarConJustificacion.mock.calls[0][1].id_instructor_reemplazo).toBe('3');
  });

  it('should warn when there is no other active instructor to take the projects', async () => {
    usuariosService.impactoEliminacion.mockResolvedValueOnce(impacto({ proyectos: 1, instructores: [] }));

    abrirModal();

    expect(await screen.findByRole('alert')).toHaveTextContent('No hay otro instructor activo');
  });

  it('should reject a support file bigger than 10 MB', async () => {
    usuariosService.impactoEliminacion.mockResolvedValueOnce(impacto());
    const user = userEvent.setup();
    abrirModal();
    const archivo = new File(['x'], 'acta.pdf', { type: 'application/pdf' });
    Object.defineProperty(archivo, 'size', { value: 11 * 1024 * 1024 });

    await user.upload(await screen.findByLabelText(/Adjuntar archivos/), archivo);

    expect(screen.getByRole('alert')).toHaveTextContent('"acta.pdf" supera los 10 MB');
  });

  it('should reject a support file that is not PDF or image', async () => {
    usuariosService.impactoEliminacion.mockResolvedValueOnce(impacto());
    // applyAccept: false = la persona elige "Todos los archivos" en el diálogo del navegador
    const user = userEvent.setup({ applyAccept: false });
    abrirModal();

    await user.upload(await screen.findByLabelText(/Adjuntar archivos/), new File(['x'], 'notas.txt', { type: 'text/plain' }));

    expect(screen.getByRole('alert')).toHaveTextContent('solo se permiten PDF, JPG, PNG o WEBP');
  });

  it('should show the backend message when the user information cannot be loaded', async () => {
    usuariosService.impactoEliminacion.mockRejectedValueOnce({ response: { data: { message: 'Usuario no encontrado' } } });

    abrirModal();

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario no encontrado');
  });

  it('should keep the modal open and show the error when the deletion fails', async () => {
    usuariosService.impactoEliminacion.mockResolvedValueOnce(impacto());
    usuariosService.eliminarConJustificacion.mockRejectedValueOnce({ response: { data: { message: 'No se puede eliminar al administrador' } } });
    const user = userEvent.setup();
    const { onEliminado } = abrirModal();

    await llenarCuestionario(user, 'Solicitud del coordinador académico');
    await user.click(botonEliminar());

    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede eliminar al administrador');
    expect(onEliminado).not.toHaveBeenCalled();
  });
});
