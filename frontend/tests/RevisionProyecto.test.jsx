import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RevisionProyecto from '../src/components/RevisionProyecto.jsx';
import { entregasService, proyectosService } from '../src/services/api.js';

vi.mock('../src/services/api.js', () => ({
  proyectosService: { getRevision: vi.fn() },
  entregasService: { getDetalle: vi.fn() },
}));

// Lo que responde GET /proyectos/:id/revision
const REVISION = {
  entregables: [
    { id_entregable: 1, nombre: 'Documento de requisitos', nombre_fase: 'Análisis', estado: 'Aprobado',
      archivos: [{ id_archivo: 5, nombre_archivo: 'requisitos.pdf', ruta_archivo: '/uploads/a1.pdf' }],
      comentarios: [{ id_comentario: 8, autor_nombre: 'Laura Gómez', autor_rol: 'Instructor', contenido: 'Falta el RF-12', fecha_comentario: '2026-10-01T15:00:00Z' }],
      evaluaciones: [] },
    { id_entregable: 2, nombre: 'Diagrama de clases', nombre_fase: 'Diseño', estado: 'Pendiente',
      archivos: [], comentarios: [], evaluaciones: [] },
  ],
  entregas: [
    { id_entrega: 30, titulo_tarea: 'Diseñar login', aprendiz_nombre: 'Carlos Herrera', estado: 'Aprobada', calificacion: 92, ruta_archivo: '/uploads/b2.pdf' },
    { id_entrega: 31, titulo_tarea: 'Modelo ER', aprendiz_nombre: 'Juan Martínez', estado: 'Entregada', calificacion: null },
  ],
};

const valorDe = (etiqueta) => within(screen.getByText(etiqueta).parentElement).getByText(/\d/).textContent;

beforeEach(() => {
  vi.clearAllMocks();
  proyectosService.getRevision.mockResolvedValue({ data: { data: REVISION } });
});

describe('RevisionProyecto', () => {
  it('should add up the documents of the deliverables and of the task deliveries', async () => {
    // Arrange + Act
    render(<RevisionProyecto idProyecto="1" />);
    await screen.findByText('Documento de requisitos');

    // Assert: 1 archivo del entregable + 1 archivo de una entrega de tarea
    expect(valorDe('Documentos adjuntos')).toBe('2');
    expect(valorDe('Comentarios')).toBe('1');
    expect(valorDe('Entregas calificadas')).toBe('1/2');
  });

  it('should only show the deliverables with documents when that filter is chosen', async () => {
    const user = userEvent.setup();
    render(<RevisionProyecto idProyecto="1" />);
    await screen.findByText('Diagrama de clases');

    await user.click(screen.getByRole('button', { name: 'Con documentos' }));

    expect(screen.getByText('Documento de requisitos')).toBeInTheDocument();
    expect(screen.queryByText('Diagrama de clases')).not.toBeInTheDocument();
  });

  it('should show the empty state when no deliverable matches the filter', async () => {
    const user = userEvent.setup();
    render(<RevisionProyecto idProyecto="1" />);
    await screen.findByText('Documento de requisitos');

    await user.click(screen.getByRole('button', { name: 'Evaluados' }));

    expect(screen.getByRole('heading', { name: 'Nada que revisar con este filtro' })).toBeInTheDocument();
  });

  it('should be read only: the admin can open a delivery but there is nothing to grade', async () => {
    entregasService.getDetalle.mockResolvedValue({ data: { data: { titulo_tarea: 'Diseñar login', calificacion: 92 } } });
    const user = userEvent.setup();
    render(<RevisionProyecto idProyecto="1" />);
    await screen.findByText('Diseñar login');

    await user.click(screen.getAllByRole('button', { name: 'Ver' })[0]);

    expect(await screen.findByText('Revisión de entrega')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Calificar|Guardar/ })).not.toBeInTheDocument();
  });

  it('should show the backend message when the review cannot be loaded', async () => {
    proyectosService.getRevision.mockRejectedValue({ response: { data: { message: 'No tienes permisos para realizar esta acción' } } });

    render(<RevisionProyecto idProyecto="1" />);

    expect(await screen.findByText('No tienes permisos para realizar esta acción')).toBeInTheDocument();
  });
});
