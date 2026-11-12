import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ChatProyecto from '../src/components/ChatProyecto.jsx';
import { mensajesService } from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

vi.mock('../src/services/api.js', () => ({
  mensajesService: { getByProyecto: vi.fn(), create: vi.fn(), update: vi.fn(), votar: vi.fn(), fijar: vi.fn(), getFirma: vi.fn(), setFirma: vi.fn() },
  notificacionesService: { getByUsuario: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}));

const APRENDIZ = { id: 4, nombres: 'Carlos', rol: 'Aprendiz' };
const INSTRUCTOR = { id: 2, nombres: 'Laura', rol: 'Instructor' };
const ENCUESTA = {
  id_mensaje: 90, id_remitente: 2, remitente_nombre: 'Laura Gómez', remitente_rol: 'Instructor', tipo: 'encuesta',
  contenido: '¿Qué día revisamos?', fecha_envio: '2026-11-10T15:00:00Z',
  encuesta: { opciones: [{ id_opcion: 1, texto: 'Lunes', votos: 1 }, { id_opcion: 2, texto: 'Martes', votos: 0 }], total_votos: 1, mi_opcion: null },
};
const AVISO = { id_mensaje: 91, id_remitente: 2, remitente_nombre: 'Laura Gómez', tipo: 'aviso', fijado: 1, contenido: 'Mañana *no* hay clase', fecha_envio: '2026-11-10T16:00:00Z' };
const TEXTO = { id_mensaje: 92, id_remitente: 5, remitente_nombre: 'Valentina Ruiz', tipo: 'texto', contenido: 'Subí el _avance_', firma: 'Valentina · ADSO', fecha_envio: '2026-11-10T17:00:00Z' };

function Chat({ usuario, iniciales, avisos = false }) {
  const [mensajes, setMensajes] = useState(iniciales);
  return <ChatProyecto idProyecto="1" mensajes={mensajes} setMensajes={setMensajes} usuario={usuario} puedePublicarAvisos={avisos} />;
}

beforeAll(() => { window.HTMLElement.prototype.scrollIntoView = () => {}; });
beforeEach(() => {
  vi.clearAllMocks();
  mensajesService.getFirma.mockResolvedValue({ data: { data: { firma: 'Carlos · ADSO 3228970' } } });
  mensajesService.getByProyecto.mockResolvedValue({ data: { data: [] } });
  mensajesService.create.mockResolvedValue({ data: {} });
});

describe('ChatProyecto', () => {
  it('should show pinned notices, formatted text and the signature', async () => {
    // Arrange / Act
    renderConSesion(<Chat usuario={APRENDIZ} iniciales={[AVISO, TEXTO]} />, { usuario: APRENDIZ });

    // Assert
    const fijados = screen.getByRole('region', { name: 'Avisos fijados' });
    expect(within(fijados).getByText('no').tagName).toBe('STRONG');
    expect(screen.getByText('avance').tagName).toBe('EM');
    expect(screen.getByText('— Valentina · ADSO')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desfijar' })).not.toBeInTheDocument();
  });

  it('should vote in a poll and show the new results', async () => {
    // Arrange
    const user = userEvent.setup();
    mensajesService.votar.mockResolvedValue({ data: { data: {
      opciones: [{ id_opcion: 1, texto: 'Lunes', votos: 1 }, { id_opcion: 2, texto: 'Martes', votos: 1 }], total_votos: 2, mi_opcion: 2,
    } } });
    renderConSesion(<Chat usuario={APRENDIZ} iniciales={[ENCUESTA]} />, { usuario: APRENDIZ });

    // Act
    await user.click(screen.getByRole('button', { name: /^Martes: 0 votos/ }));

    // Assert
    expect(mensajesService.votar).toHaveBeenCalledWith(90, 2);
    expect(await screen.findByRole('button', { name: 'Martes: 1 voto (50%), tu voto' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/2 votos/)).toBeInTheDocument();
  });

  it('should reply to a message and add the signature when it is checked', async () => {
    // Arrange
    const user = userEvent.setup();
    renderConSesion(<Chat usuario={APRENDIZ} iniciales={[TEXTO]} />, { usuario: APRENDIZ });
    const firma = await screen.findByRole('checkbox', { name: /Agregar mi firma/ });

    // Act
    await user.click(screen.getByRole('button', { name: 'Responder a Valentina Ruiz' }));
    await user.click(firma);
    await user.type(screen.getByLabelText('Mensaje'), 'Gracias{Enter}');

    // Assert
    expect(mensajesService.create).toHaveBeenCalledWith({ contenido: 'Gracias', id_proyecto: '1', id_respuesta_a: 92, incluir_firma: true });
  });

  it('should create a poll with its options', async () => {
    // Arrange
    const user = userEvent.setup();
    renderConSesion(<Chat usuario={APRENDIZ} iniciales={[]} />, { usuario: APRENDIZ });

    // Act
    await user.click(screen.getByRole('button', { name: 'Crear encuesta' }));
    const dialogo = screen.getByRole('dialog', { name: 'Nueva encuesta' });
    await user.type(within(dialogo).getByLabelText('Pregunta *'), '¿Qué día?');
    await user.type(within(dialogo).getByLabelText('Opción 1'), 'Lunes');
    await user.type(within(dialogo).getByLabelText('Opción 2'), 'Martes');
    await user.click(within(dialogo).getByRole('button', { name: 'Publicar encuesta' }));

    // Assert
    expect(mensajesService.create).toHaveBeenCalledWith({ contenido: '¿Qué día?', id_proyecto: '1', tipo: 'encuesta', opciones: ['Lunes', 'Martes'] });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should let only the responsible instructor publish a pinned notice', async () => {
    // Arrange
    const user = userEvent.setup();
    const { unmount } = renderConSesion(<Chat usuario={APRENDIZ} iniciales={[]} />, { usuario: APRENDIZ });
    expect(screen.queryByRole('checkbox', { name: /aviso fijado/ })).not.toBeInTheDocument();
    unmount();
    renderConSesion(<Chat usuario={INSTRUCTOR} iniciales={[]} avisos />, { usuario: INSTRUCTOR });

    // Act
    await user.click(screen.getByRole('checkbox', { name: /Publicar como aviso fijado/ }));
    await user.type(screen.getByLabelText('Mensaje'), 'Mañana no hay clase');
    await user.click(screen.getByRole('button', { name: 'Publicar aviso 📢' }));

    // Assert
    expect(mensajesService.create).toHaveBeenCalledWith({ contenido: 'Mañana no hay clase', id_proyecto: '1', tipo: 'aviso' });
  });

  it('should wrap the selection in bold from the toolbar', async () => {
    // Arrange
    const user = userEvent.setup();
    renderConSesion(<Chat usuario={APRENDIZ} iniciales={[]} />, { usuario: APRENDIZ });
    const entrada = screen.getByLabelText('Mensaje');
    await user.type(entrada, 'Hay clase');
    entrada.setSelectionRange(4, 9);

    // Act
    await user.click(screen.getByRole('button', { name: 'Negrita' }));

    // Assert
    expect(entrada).toHaveValue('Hay *clase*');
  });
});
