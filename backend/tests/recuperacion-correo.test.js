import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

// Dependencia externa: el correo. El controlador no usa nodemailer directo, sino nuestro
// adaptador services/mail.service.js (la "interfaz propia"). En los tests se reemplaza ESE
// adaptador, nunca la librería: si mañana cambiamos nodemailer por otra, estos tests no cambian.
const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const mailService = require('../src/services/mail.service');
const { requestPasswordReset } = require('../src/controllers/auth.controller');

const SECRETO = 'secreto_solo_para_tests_de_correo_32';
const CORREO = 'carlos.herrera@sgpsena.local';
const hmac = (valor) => crypto.createHmac('sha256', SECRETO).update(String(valor)).digest('hex');

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Stub de la BD para el camino feliz: usuario activo, sin código reciente, borrar viejos, insertar
function bdConUsuarioActivo() {
  return vi.spyOn(db, 'query')
    .mockResolvedValueOnce([[{ id_usuario: 4, nombres: 'Carlos Andrés' }]]) // SELECT usuario
    .mockResolvedValueOnce([[]])                                         // SELECT código reciente
    .mockResolvedValueOnce([{}])                                         // DELETE códigos viejos
    .mockResolvedValueOnce([{ insertId: 1 }]);                           // INSERT código
}

describe('requestPasswordReset y el correo', () => {
  it('should mail once the same 6-digit code that it stores hashed', async () => {
    // Arrange: SPY del adaptador de correo (lo reemplaza para no enviar nada real)
    const query = bdConUsuarioActivo();
    const enviar = vi.spyOn(mailService, 'enviarCodigoRecuperacion').mockResolvedValue({ enviado: true });
    const res = crearRes();

    // Act
    await requestPasswordReset(crearReq({ body: { correo: CORREO } }), res);

    // Assert de COMPORTAMIENTO: se llamó una vez, al correo de la cuenta y con el tiempo de vida
    expect(enviar).toHaveBeenCalledOnce();
    const [{ para, nombre, codigo, minutos }] = enviar.mock.calls[0];
    expect({ para, nombre, minutos }).toEqual({ para: CORREO, nombre: 'Carlos Andrés', minutos: 3 });
    expect(codigo).toMatch(/^\d{6}$/);
    // Assert de ESTADO: lo guardado en la BD es el hash de ESE código (si no, nunca se podría verificar)
    const [, valoresInsert] = query.mock.calls[3];
    expect(valoresInsert[1]).toBe(hmac(`4:${codigo}`));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should not mail anything when the email is not registered, and answer the same message', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]); // stub: no existe
    const enviar = vi.spyOn(mailService, 'enviarCodigoRecuperacion');
    const res = crearRes();

    await requestPasswordReset(crearReq({ body: { correo: 'nadie@sgpsena.local' } }), res);

    expect(enviar).not.toHaveBeenCalled();
    // Misma respuesta que con un correo real: no revela qué correos existen
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true, message: 'Si el correo está registrado, enviamos un código de verificación a esa dirección.',
    }));
  });

  it('should not mail a second code before the 60 s cooldown', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_usuario: 4, nombres: 'Carlos Andrés' }]])
      .mockResolvedValueOnce([[{ seg: 20 }]]); // stub: pidió un código hace 20 s
    const enviar = vi.spyOn(mailService, 'enviarCodigoRecuperacion');
    const res = crearRes();

    await requestPasswordReset(crearReq({ body: { correo: CORREO } }), res);

    expect(enviar).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { retry_after: 40 } }));
  });

  it('should still answer 200 when the mail server fails, and leave the error in the log', async () => {
    // Arrange: STUB que falla (servidor SMTP caído) + SPY de console.error para verificar el registro
    bdConUsuarioActivo();
    vi.spyOn(mailService, 'enviarCodigoRecuperacion').mockRejectedValue(new Error('SMTP connection timeout'));
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = crearRes();

    // Act
    await requestPasswordReset(crearReq({ body: { correo: CORREO } }), res);

    // Assert: la app resiste (no 500) y el fallo no se pierde
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(consola).toHaveBeenCalledWith(expect.stringContaining('[mail]'), 'SMTP connection timeout');
  });
});

describe('mail.service en modo consola (desarrollo)', () => {
  afterEach(() => {
    delete process.env.MAIL_MODE;
  });

  it('should print the code instead of sending it when MAIL_MODE is console', async () => {
    process.env.MAIL_MODE = 'console';
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const resultado = await mailService.enviarCodigoRecuperacion({ para: CORREO, nombre: 'Carlos', codigo: '482913', minutos: 3 });

    // Estado: el adaptador avisa que no envió nada
    expect(resultado).toEqual({ enviado: false, consola: true });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('482913'));
  });
});
