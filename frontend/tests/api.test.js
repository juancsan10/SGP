import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  agendaService, archivosService, authService, comentariosService, entregablesService, entregasService,
  equiposService, evaluacionesService, fasesService, githubIntegrationService, historialService,
  mensajesService, notificacionesService, passwordService, proyectosService, repositoriosService,
  reunionesService, solicitudesService, tareasService, usuariosService,
} from '../src/services/api.js';

// Doble: FAKE del backend con MSW. A diferencia de vi.mock, aquí se ejecuta el código real de
// services/api.js (instancia de axios, interceptores, URL y cuerpo) y MSW responde a nivel HTTP.
const PROYECTO = { id_proyecto: 1, nombre: 'SGP SENA', estado: 'Activo' };

const server = setupServer(
  // Stub por defecto: el "backend feliz"
  http.get('/api/v1/proyectos', () => HttpResponse.json({ success: true, data: [PROYECTO] })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // ninguna petición se escapa a la red
afterEach(() => server.resetHandlers()); // los server.use de un test no afectan al siguiente
afterAll(() => server.close());

beforeEach(() => {
  localStorage.clear();
});

describe('cliente HTTP: caso feliz y token', () => {
  it('should return the backend JSON as response.data', async () => {
    // Verifica ESTADO: lo que recibe la pantalla
    const res = await proyectosService.getAll();

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ success: true, data: [PROYECTO] });
  });

  it('should send the saved token in the Authorization header', async () => {
    // Arrange: spy de la petición, guarda la cabecera que recibió el "backend"
    let autorizacion;
    server.use(http.get('/api/v1/proyectos', ({ request }) => {
      autorizacion = request.headers.get('Authorization');
      return HttpResponse.json({ success: true, data: [] });
    }));
    localStorage.setItem('sgp_token', 'abc.def.ghi');

    // Act
    await proyectosService.getAll();

    // Assert: verifica COMPORTAMIENTO (con qué se llamó al backend)
    expect(autorizacion).toBe('Bearer abc.def.ghi');
  });

  it('should not send an Authorization header without a session', async () => {
    let autorizacion = 'sin revisar';
    server.use(http.get('/api/v1/proyectos', ({ request }) => {
      autorizacion = request.headers.get('Authorization');
      return HttpResponse.json({ success: true, data: [] });
    }));

    await proyectosService.getAll();

    expect(autorizacion).toBeNull();
  });
});

describe('cliente HTTP: errores del backend', () => {
  it('should reject with the status and the message of a 500', async () => {
    // Stub: el backend falla con el contrato de error de la semana 4
    server.use(http.get('/api/v1/proyectos', () =>
      HttpResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })));

    const error = await proyectosService.getAll().catch((e) => e);

    expect(error.response.status).toBe(500);
    expect(error.response.data.message).toBe('Error interno del servidor');
  });

  it('should give the pages the detail of a validation error (400 with errors[])', async () => {
    server.use(http.post('/api/v1/proyectos', () => HttpResponse.json({
      success: false, message: 'Error de validación', errors: [{ campo: 'nombre', mensaje: 'El nombre es requerido' }],
    }, { status: 400 })));

    const error = await proyectosService.create({ nombre: '' }).catch((e) => e);

    expect(error.response.status).toBe(400);
    expect(error.response.data.errors).toEqual([{ campo: 'nombre', mensaje: 'El nombre es requerido' }]);
  });

  it('should keep an HTML body as text, so the pages fall back to their own message', async () => {
    // Stub: un proxy o un servidor caído responde HTML en vez de JSON
    server.use(http.get('/api/v1/proyectos', () => new HttpResponse('<!DOCTYPE html><html><body>Bad Gateway</body></html>', {
      status: 502, headers: { 'Content-Type': 'text/html' },
    })));

    const error = await proyectosService.getAll().catch((e) => e);

    // El cliente no revienta al leer el cuerpo: data es texto y data.message no existe,
    // así que `err.response?.data?.message || 'mensaje por defecto'` muestra el mensaje por defecto.
    expect(error.response.status).toBe(502);
    expect(typeof error.response.data).toBe('string');
    expect(error.response.data.message).toBeUndefined();
  });

  it('should reject without response when the backend is unreachable', async () => {
    server.use(http.get('/api/v1/proyectos', () => HttpResponse.error()));

    const error = await proyectosService.getAll().catch((e) => e);

    expect(error.response).toBeUndefined();
    expect(error.message).toBe('Network Error');
  });
});

describe('cliente HTTP: sesión vencida (401)', () => {
  let locationOriginal;

  beforeEach(() => {
    // Stub de window.location: jsdom no navega, así vemos a dónde nos mandaría el cliente
    locationOriginal = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { href: 'http://localhost:3000/proyectos' } });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: locationOriginal });
  });

  it('should close the session and go to /login when a protected request answers 401', async () => {
    server.use(http.get('/api/v1/proyectos', () =>
      HttpResponse.json({ success: false, message: 'Token inválido o expirado' }, { status: 401 })));
    localStorage.setItem('sgp_token', 'vencido');
    localStorage.setItem('sgp_usuario', JSON.stringify({ id: 4 }));

    await expect(proyectosService.getAll()).rejects.toMatchObject({ response: { status: 401 } });

    expect(localStorage.getItem('sgp_token')).toBeNull();
    expect(localStorage.getItem('sgp_usuario')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('should NOT redirect on a 401 of the login itself, so LoginPage can show "Credenciales inválidas"', async () => {
    server.use(http.post('/api/v1/auth/login', () =>
      HttpResponse.json({ success: false, message: 'Credenciales inválidas' }, { status: 401 })));

    const error = await authService.login({ correo: 'a@b.co', contrasena: 'x' }).catch((e) => e);

    expect(error.response.data.message).toBe('Credenciales inválidas');
    expect(window.location.href).toBe('http://localhost:3000/proyectos');
  });
});

describe('cliente HTTP: subida de archivos', () => {
  it('should send the file as multipart form data with the field "archivo"', async () => {
    let tipo;
    let tamano;
    server.use(http.post('/api/v1/archivos/upload/7', async ({ request }) => {
      tipo = request.headers.get('Content-Type');
      tamano = (await request.formData()).get('archivo').size;
      return HttpResponse.json({ success: true }, { status: 201 });
    }));
    const archivo = new File(['%PDF-1.4'], 'avance.pdf', { type: 'application/pdf' });

    await archivosService.upload(7, archivo);

    // Si alguien deja el Content-Type JSON por defecto, el backend (multer) no recibe el archivo
    expect(tipo).toMatch(/^multipart\/form-data; boundary=/);
    expect(tamano).toBe(archivo.size);
  });

  it('should send the deletion questionnaire with its optional fields only when they exist', async () => {
    let campos;
    server.use(http.post('/api/v1/usuarios/9/eliminacion', async ({ request }) => {
      campos = [...(await request.formData()).keys()];
      return HttpResponse.json({ success: true });
    }));

    await usuariosService.eliminarConJustificacion(9, { motivo: 'Retiro', descripcion: 'Se retiró de la formación' });

    expect(campos).toEqual(['motivo', 'descripcion']);
  });
});

// Contrato de rutas: cada función del cliente llama al verbo y a la ruta que expone el backend.
// Si alguien cambia una URL en api.js (o en el backend sin avisar), este test lo dice.
describe('cliente HTTP: contrato de rutas con el backend', () => {
  let recibida;

  beforeEach(() => {
    recibida = null;
    server.use(http.all('/api/v1/*', async ({ request }) => {
      const url = new URL(request.url);
      const texto = ['GET', 'HEAD'].includes(request.method) ? '' : await request.text();
      recibida = { metodo: request.method, ruta: url.pathname, query: url.search, cuerpo: texto };
      return HttpResponse.json({ success: true });
    }));
  });

  const casos = [
    ['authService.login', () => authService.login({ correo: 'a@b.co' }), 'POST', '/api/v1/auth/login'],
    ['authService.register', () => authService.register({}), 'POST', '/api/v1/auth/register'],
    ['authService.createUser', () => authService.createUser({}), 'POST', '/api/v1/auth/users'],
    ['usuariosService.getAll', () => usuariosService.getAll({ rol: 'Aprendiz' }), 'GET', '/api/v1/usuarios', '?rol=Aprendiz'],
    ['usuariosService.getById', () => usuariosService.getById(3), 'GET', '/api/v1/usuarios/3'],
    ['usuariosService.buscarPorIdentificacion', () => usuariosService.buscarPorIdentificacion('123', 'Instructor'), 'GET', '/api/v1/usuarios/buscar', '?identificacion=123&rol=Instructor'],
    ['usuariosService.update', () => usuariosService.update(3, {}), 'PUT', '/api/v1/usuarios/3'],
    ['usuariosService.remove', () => usuariosService.remove(3), 'DELETE', '/api/v1/usuarios/3'],
    ['usuariosService.activar', () => usuariosService.activar(3), 'PUT', '/api/v1/usuarios/3/activar'],
    ['usuariosService.impactoEliminacion', () => usuariosService.impactoEliminacion(3), 'GET', '/api/v1/usuarios/3/impacto-eliminacion'],
    ['proyectosService.getRevision', () => proyectosService.getRevision(1), 'GET', '/api/v1/proyectos/1/revision'],
    ['proyectosService.getById', () => proyectosService.getById(1), 'GET', '/api/v1/proyectos/1'],
    ['proyectosService.update', () => proyectosService.update(1, {}), 'PUT', '/api/v1/proyectos/1'],
    ['proyectosService.remove', () => proyectosService.remove(1), 'DELETE', '/api/v1/proyectos/1'],
    ['equiposService.getByProyecto', () => equiposService.getByProyecto(1), 'GET', '/api/v1/equipos/1'],
    ['equiposService.create', () => equiposService.create({}), 'POST', '/api/v1/equipos'],
    ['equiposService.remove', () => equiposService.remove(5, 'Cambio de ficha'), 'DELETE', '/api/v1/equipos/5', '', '{"motivo":"Cambio de ficha"}'],
    ['equiposService.listSolicitudes', () => equiposService.listSolicitudes(), 'GET', '/api/v1/equipos/solicitudes/listar', '?estado=Pendiente'],
    ['equiposService.resolverSolicitud', () => equiposService.resolverSolicitud(2, true, 'ok'), 'PUT', '/api/v1/equipos/solicitudes/2/resolver', '', '{"aprobar":true,"observacion_admin":"ok"}'],
    ['fasesService.getByProyecto', () => fasesService.getByProyecto(1), 'GET', '/api/v1/fases/1'],
    ['fasesService.create', () => fasesService.create({}), 'POST', '/api/v1/fases'],
    ['fasesService.update', () => fasesService.update(2, {}), 'PUT', '/api/v1/fases/2'],
    ['fasesService.remove', () => fasesService.remove(2), 'DELETE', '/api/v1/fases/2'],
    ['entregablesService.getByFase', () => entregablesService.getByFase(2), 'GET', '/api/v1/entregables/2'],
    ['entregablesService.create', () => entregablesService.create({}), 'POST', '/api/v1/entregables'],
    ['entregablesService.update', () => entregablesService.update(4, {}), 'PUT', '/api/v1/entregables/4'],
    ['entregablesService.remove', () => entregablesService.remove(4), 'DELETE', '/api/v1/entregables/4'],
    ['tareasService.getByProyecto', () => tareasService.getByProyecto(1), 'GET', '/api/v1/tareas/1'],
    ['tareasService.getAllAdmin', () => tareasService.getAllAdmin({ estado: 'Pendiente' }), 'GET', '/api/v1/tareas', '?estado=Pendiente'],
    ['tareasService.getRecientes', () => tareasService.getRecientes(), 'GET', '/api/v1/tareas/recientes/dashboard', '?limit=8'],
    ['tareasService.create', () => tareasService.create({}), 'POST', '/api/v1/tareas'],
    ['tareasService.update', () => tareasService.update(6, {}), 'PUT', '/api/v1/tareas/6'],
    ['tareasService.remove', () => tareasService.remove(6), 'DELETE', '/api/v1/tareas/6'],
    ['mensajesService.getByProyecto', () => mensajesService.getByProyecto(1), 'GET', '/api/v1/mensajes/1'],
    ['mensajesService.create', () => mensajesService.create({}), 'POST', '/api/v1/mensajes'],
    ['mensajesService.update', () => mensajesService.update(8, 'Hola'), 'PUT', '/api/v1/mensajes/8', '', '{"contenido":"Hola"}'],
    ['mensajesService.getRecientes', () => mensajesService.getRecientes(3), 'GET', '/api/v1/mensajes/recientes/dashboard', '?limit=3'],
    ['notificacionesService.getByUsuario', () => notificacionesService.getByUsuario(4), 'GET', '/api/v1/notificaciones/4'],
    ['notificacionesService.marcarLeida', () => notificacionesService.marcarLeida(10), 'PUT', '/api/v1/notificaciones/10'],
    ['notificacionesService.marcarTodasLeidas', () => notificacionesService.marcarTodasLeidas(4), 'PUT', '/api/v1/notificaciones/leer-todas/4'],
    ['notificacionesService.broadcast', () => notificacionesService.broadcast({}), 'POST', '/api/v1/notificaciones/broadcast'],
    ['notificacionesService.getEnviadas', () => notificacionesService.getEnviadas({ limit: 5 }), 'GET', '/api/v1/notificaciones/enviadas', '?limit=5'],
    ['repositoriosService.getByProyecto', () => repositoriosService.getByProyecto(1), 'GET', '/api/v1/repositorios/1'],
    ['repositoriosService.create', () => repositoriosService.create({}), 'POST', '/api/v1/repositorios'],
    ['repositoriosService.update', () => repositoriosService.update(2, {}), 'PUT', '/api/v1/repositorios/2'],
    ['repositoriosService.toggleEstado', () => repositoriosService.toggleEstado(2, false), 'PUT', '/api/v1/repositorios/2/estado', '', '{"activo":false}'],
    ['repositoriosService.setSemaforo', () => repositoriosService.setSemaforo(2, 'Rojo', 'Sin commits'), 'PUT', '/api/v1/repositorios/2/semaforo', '', '{"estado_semaforo":"Rojo","observacion":"Sin commits"}'],
    ['historialService.getAll', () => historialService.getAll(), 'GET', '/api/v1/historial'],
    ['historialService.getByTabla', () => historialService.getByTabla('tareas'), 'GET', '/api/v1/historial/tareas'],
    ['historialService.getEstadisticas', () => historialService.getEstadisticas(), 'GET', '/api/v1/historial/estadisticas/dashboard'],
    ['historialService.getEliminaciones', () => historialService.getEliminaciones(), 'GET', '/api/v1/historial/eliminaciones'],
    ['historialService.getEliminacion', () => historialService.getEliminacion(3), 'GET', '/api/v1/historial/eliminaciones/3'],
    ['comentariosService.getByEntregable', () => comentariosService.getByEntregable(4), 'GET', '/api/v1/comentarios/4'],
    ['comentariosService.create', () => comentariosService.create({}), 'POST', '/api/v1/comentarios'],
    ['comentariosService.update', () => comentariosService.update(1, {}), 'PUT', '/api/v1/comentarios/1'],
    ['comentariosService.remove', () => comentariosService.remove(1), 'DELETE', '/api/v1/comentarios/1'],
    ['archivosService.getByEntregable', () => archivosService.getByEntregable(4), 'GET', '/api/v1/archivos/4'],
    ['archivosService.create', () => archivosService.create({}), 'POST', '/api/v1/archivos'],
    ['archivosService.remove', () => archivosService.remove(1), 'DELETE', '/api/v1/archivos/1'],
    ['entregasService.getByTarea', () => entregasService.getByTarea(6), 'GET', '/api/v1/entregas/tarea/6'],
    ['entregasService.getAllAdmin', () => entregasService.getAllAdmin(), 'GET', '/api/v1/entregas'],
    ['entregasService.getDetalle', () => entregasService.getDetalle(2), 'GET', '/api/v1/entregas/2/detalle'],
    ['entregasService.submit', () => entregasService.submit(6, {}), 'POST', '/api/v1/entregas/tarea/6'],
    ['entregasService.review', () => entregasService.review(6, {}), 'PUT', '/api/v1/entregas/tarea/6/revision'],
    ['evaluacionesService.getByEntregable', () => evaluacionesService.getByEntregable(4), 'GET', '/api/v1/evaluaciones/4'],
    ['evaluacionesService.create', () => evaluacionesService.create({}), 'POST', '/api/v1/evaluaciones'],
    ['evaluacionesService.update', () => evaluacionesService.update(1, {}), 'PUT', '/api/v1/evaluaciones/1'],
    ['reunionesService.getByProyecto', () => reunionesService.getByProyecto(1), 'GET', '/api/v1/reuniones/1'],
    ['reunionesService.create', () => reunionesService.create({}), 'POST', '/api/v1/reuniones'],
    ['reunionesService.update', () => reunionesService.update(3, {}), 'PUT', '/api/v1/reuniones/3'],
    ['reunionesService.remove', () => reunionesService.remove(3), 'DELETE', '/api/v1/reuniones/3'],
    ['githubIntegrationService.getByUsuario', () => githubIntegrationService.getByUsuario(4), 'GET', '/api/v1/github-integration/4'],
    ['githubIntegrationService.create', () => githubIntegrationService.create({}), 'POST', '/api/v1/github-integration'],
    ['githubIntegrationService.update', () => githubIntegrationService.update({}), 'PUT', '/api/v1/github-integration'],
    ['githubIntegrationService.remove', () => githubIntegrationService.remove(), 'DELETE', '/api/v1/github-integration'],
    ['agendaService.calendar', () => agendaService.calendar(4), 'GET', '/api/v1/agenda/4/calendario'],
    ['agendaService.timeline', () => agendaService.timeline(4), 'GET', '/api/v1/agenda/4/timeline'],
    ['passwordService.request', () => passwordService.request('a@b.co'), 'POST', '/api/v1/auth/password-reset/request', '', '{"correo":"a@b.co"}'],
    ['passwordService.verify', () => passwordService.verify('a@b.co', '123456'), 'POST', '/api/v1/auth/password-reset/verify', '', '{"correo":"a@b.co","token":"123456"}'],
    ['passwordService.confirm', () => passwordService.confirm('a@b.co', 'ses', 'Nueva2026*'), 'POST', '/api/v1/auth/password-reset/confirm', '', '{"correo":"a@b.co","reset_session":"ses","nueva_contrasena":"Nueva2026*"}'],
    ['solicitudesService.tipos', () => solicitudesService.tipos(), 'GET', '/api/v1/solicitudes/tipos'],
    ['solicitudesService.mias', () => solicitudesService.mias(), 'GET', '/api/v1/solicitudes/mias'],
    ['solicitudesService.getAll', () => solicitudesService.getAll({ estado: 'Pendiente' }), 'GET', '/api/v1/solicitudes', '?estado=Pendiente'],
    ['solicitudesService.create', () => solicitudesService.create({}), 'POST', '/api/v1/solicitudes'],
    ['solicitudesService.resolver', () => solicitudesService.resolver(2, 'Aprobada', 'Listo'), 'PUT', '/api/v1/solicitudes/2/resolver', '', '{"estado":"Aprobada","respuesta":"Listo"}'],
  ];

  it.each(casos)('%s should call %s %s', async (_nombre, llamar, metodo, ruta, query = '', cuerpo) => {
    await llamar();

    expect(recibida.metodo).toBe(metodo);
    expect(recibida.ruta).toBe(ruta);
    expect(recibida.query).toBe(query);
    if (cuerpo !== undefined) expect(recibida.cuerpo).toBe(cuerpo);
  });

  it('should send the optional fields of a task delivery upload only when they exist', async () => {
    server.use(http.post('/api/v1/entregas/tarea/6/upload', async ({ request }) => {
      recibida = [...(await request.formData()).keys()];
      return HttpResponse.json({ success: true });
    }));
    const archivo = new File(['x'], 'entrega.pdf', { type: 'application/pdf' });

    await entregasService.uploadArchivo(6, archivo, { comentario_aprendiz: 'Listo' });

    expect(recibida).toEqual(['archivo', 'comentario_aprendiz']);
  });
});
