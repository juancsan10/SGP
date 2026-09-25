// =====================================================
// services/api.js
// Cliente Axios centralizado para el backend SGP
// =====================================================
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',  // El proxy de Vite lo redirige a http://localhost:3000
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Inyectar token JWT en cada petición ──────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sgp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Manejar errores globalmente ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token expirado → redirigir al login.
    // Excepción: un 401 en el propio login (credenciales inválidas) NO debe
    // recargar la página, o se pierde el mensaje de error y la reacción de
    // los personajes en LoginPage.
    const esPeticionLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !esPeticionLogin) {
      localStorage.removeItem('sgp_token');
      localStorage.removeItem('sgp_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────
export const authService = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  // NUEVO: Administrador crea cuentas de Instructor o Administrador.
  createUser: (data) => api.post('/auth/users', data),
};

// ── Usuarios ──────────────────────────────────────────
export const usuariosService = {
  // NUEVO: soporta filtros de servidor (rol, estado, q) y paginación.
  getAll:   (params={}) => api.get('/usuarios', { params }),
  getById:  (id)       => api.get(`/usuarios/${id}`),
  // CORREGIDO: antes solo buscaba Aprendices ("/usuarios/aprendices/buscar").
  // Ahora busca en cualquier rol, opcionalmente filtrado con { rol }.
  buscarPorIdentificacion: (identificacion, rol) => api.get('/usuarios/buscar', { params: { identificacion, rol } }),
  update:   (id, data) => api.put(`/usuarios/${id}`, data),
  remove:   (id)       => api.delete(`/usuarios/${id}`), // desactivar (soft)
  // NUEVO
  activar:  (id)       => api.put(`/usuarios/${id}/activar`),
  // NUEVO: eliminación definitiva con cuestionario (motivo, descripción,
  // instructor de reemplazo si aplica y archivos de soporte).
  impactoEliminacion: (id) => api.get(`/usuarios/${id}/impacto-eliminacion`),
  eliminarConJustificacion: (id, { motivo, descripcion, id_instructor_reemplazo, archivos = [] }) => {
    const formData = new FormData();
    formData.append('motivo', motivo);
    formData.append('descripcion', descripcion);
    if (id_instructor_reemplazo) formData.append('id_instructor_reemplazo', id_instructor_reemplazo);
    archivos.forEach(a => formData.append('archivos', a));
    return api.post(`/usuarios/${id}/eliminacion`, formData, { headers: { 'Content-Type': undefined }, timeout: 60000 });
  },
};

// ── Proyectos ─────────────────────────────────────────
export const proyectosService = {
  // NUEVO — Administrador: documentos, comentarios, evaluaciones y entregas (solo lectura).
  getRevision: (id) => api.get(`/proyectos/${id}/revision`),
  getAll:   ()         => api.get('/proyectos'),
  getById:  (id)       => api.get(`/proyectos/${id}`),
  create:   (data)     => api.post('/proyectos', data),
  update:   (id, data) => api.put(`/proyectos/${id}`, data),
  remove:   (id)       => api.delete(`/proyectos/${id}`),
};

// ── Equipos ───────────────────────────────────────────
export const equiposService = {
  getByProyecto: (idProy)  => api.get(`/equipos/${idProy}`),
  create:        (data)    => api.post('/equipos', data),
  // CORREGIDO: ahora acepta un motivo — si quien llama es Instructor, el
  // backend crea una solicitud en vez de borrar directo (202, no 200).
  remove:        (id, motivo) => api.delete(`/equipos/${id}`, { data: { motivo } }),
  // NUEVO — solo Administrador: gestión de solicitudes de eliminación.
  listSolicitudes:    (estado = 'Pendiente') => api.get('/equipos/solicitudes/listar', { params: { estado } }),
  resolverSolicitud:  (id, aprobar, observacion_admin) => api.put(`/equipos/solicitudes/${id}/resolver`, { aprobar, observacion_admin }),
};

// ── Fases ─────────────────────────────────────────────
export const fasesService = {
  getByProyecto: (idProy)  => api.get(`/fases/${idProy}`),
  create:        (data)    => api.post('/fases', data),
  update:        (id, data)=> api.put(`/fases/${id}`, data),
  remove:        (id)      => api.delete(`/fases/${id}`),
};

// ── Entregables ───────────────────────────────────────
export const entregablesService = {
  getByFase: (idFase)      => api.get(`/entregables/${idFase}`),
  create:    (data)        => api.post('/entregables', data),
  update:    (id, data)    => api.put(`/entregables/${id}`, data),
  remove:    (id)          => api.delete(`/entregables/${id}`),
};

// ── Tareas ────────────────────────────────────────────
export const tareasService = {
  getByProyecto: (idProy)  => api.get(`/tareas/${idProy}`),
  // NUEVO — Administrador/Instructor: listado global con filtros.
  getAllAdmin: (params = {}) => api.get('/tareas', { params }),
  // NUEVO: tareas recientes para el Dashboard (cualquier rol).
  getRecientes: (limit = 8) => api.get('/tareas/recientes/dashboard', { params: { limit } }),
  create:        (data)    => api.post('/tareas', data),
  update:        (id, data)=> api.put(`/tareas/${id}`, data),
  remove:        (id)      => api.delete(`/tareas/${id}`),
};

// ── Mensajes ──────────────────────────────────────────
export const mensajesService = {
  getByProyecto: (idProy)  => api.get(`/mensajes/${idProy}`),
  create:        (data)    => api.post('/mensajes', data),
  // NUEVO: editar un mensaje propio.
  update:        (id, contenido) => api.put(`/mensajes/${id}`, { contenido }),
  // NUEVO: mensajes recientes para el Dashboard, resueltos por el backend
  // (no depende de qué proyectos trajo primero /proyectos).
  getRecientes:  (limit = 8) => api.get('/mensajes/recientes/dashboard', { params: { limit } }),
};

// ── Notificaciones ────────────────────────────────────
export const notificacionesService = {
  getByUsuario:     (idUsr)  => api.get(`/notificaciones/${idUsr}`),
  marcarLeida:      (id)     => api.put(`/notificaciones/${id}`),
  marcarTodasLeidas:(idUsr)  => api.put(`/notificaciones/leer-todas/${idUsr}`),
  // NUEVO — solo Administrador: notificar a un usuario puntual o a un rol completo.
  broadcast: (data) => api.post('/notificaciones/broadcast', data),
  // NUEVO — solo Administrador: ver las notificaciones que él mismo creó.
  getEnviadas: (params = {}) => api.get('/notificaciones/enviadas', { params }),
};

// ── Repositorios ──────────────────────────────────────
export const repositoriosService = {
  getByProyecto: (idProy)  => api.get(`/repositorios/${idProy}`),
  create:        (data)    => api.post('/repositorios', data),
  update:        (id, data)=> api.put(`/repositorios/${id}`, data),
  // NUEVO — solo Administrador: habilitar/deshabilitar y semáforo.
  toggleEstado: (id, activo) => api.put(`/repositorios/${id}/estado`, { activo }),
  setSemaforo:  (id, estado_semaforo, observacion) => api.put(`/repositorios/${id}/semaforo`, { estado_semaforo, observacion }),
};

// ── Historial ─────────────────────────────────────────
export const historialService = {
  getAll:     (params = {}) => api.get('/historial', { params }),
  getByTabla: (tabla)  => api.get(`/historial/${tabla}`),
  // NUEVO — solo Administrador: dashboard consolidado.
  getEstadisticas: () => api.get('/historial/estadisticas/dashboard'),
  // NUEVO: usuarios eliminados con su cuestionario y archivos de soporte.
  getEliminaciones: (params = {}) => api.get('/historial/eliminaciones', { params }),
  getEliminacion:   (id) => api.get(`/historial/eliminaciones/${id}`),
};

// ── Comentarios (NUEVO — RN-015) ───────────────────────
export const comentariosService = {
  getByEntregable: (idEntregable)  => api.get(`/comentarios/${idEntregable}`),
  create:          (data)          => api.post('/comentarios', data),
  update:          (id, data)      => api.put(`/comentarios/${id}`, data),
  remove:          (id)            => api.delete(`/comentarios/${id}`),
};

// ── Archivos (NUEVO) ────────────────────────────────────
export const archivosService = {
  getByEntregable: (idEntregable)  => api.get(`/archivos/${idEntregable}`),
  create:          (data)          => api.post('/archivos', data),
  remove:          (id)            => api.delete(`/archivos/${id}`),
  // NUEVO: sube el binario real (antes solo se podía escribir manualmente
  // un nombre + ruta de texto).
  upload: (idEntregable, archivo) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return api.post(`/archivos/upload/${idEntregable}`, formData, {
      headers: { 'Content-Type': undefined },
    });
  },
};

// ── Evaluaciones (NUEVO — RN-016) ──────────────────────
export const entregasService = {
  getByTarea: (idTarea) => api.get(`/entregas/tarea/${idTarea}`),
  // NUEVO — Administrador/Instructor: listado global de supervisión.
  getAllAdmin: (params = {}) => api.get('/entregas', { params }),
  getDetalle: (idEntrega) => api.get(`/entregas/${idEntrega}/detalle`), // NUEVO
  submit: (idTarea,data) => api.post(`/entregas/tarea/${idTarea}`,data),
  review: (idTarea,data) => api.put(`/entregas/tarea/${idTarea}/revision`,data),
  // NUEVO: sube el binario real de la entrega. Igual que en archivosService,
  // se quita el Content-Type por defecto para que el navegador calcule el
  // "multipart/form-data; boundary=..." correcto automáticamente.
  uploadArchivo: (idTarea, archivo, extras = {}) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (extras.comentario_aprendiz) formData.append('comentario_aprendiz', extras.comentario_aprendiz);
    if (extras.url_entrega) formData.append('url_entrega', extras.url_entrega);
    return api.post(`/entregas/tarea/${idTarea}/upload`, formData, {
      headers: { 'Content-Type': undefined },
    });
  },
};

export const evaluacionesService = {
  getByEntregable: (idEntregable)  => api.get(`/evaluaciones/${idEntregable}`),
  create:          (data)          => api.post('/evaluaciones', data),
  update:          (id, data)      => api.put(`/evaluaciones/${id}`, data),
};

// ── Reuniones (NUEVO) ───────────────────────────────────
export const reunionesService = {
  getByProyecto: (idProy)   => api.get(`/reuniones/${idProy}`),
  create:        (data)     => api.post('/reuniones', data),
  update:        (id, data) => api.put(`/reuniones/${id}`, data),
  remove:        (id)       => api.delete(`/reuniones/${id}`),
};

// ── GitHub Integration (NUEVO) ──────────────────────────
export const githubIntegrationService = {
  getByUsuario: (idUsuario)  => api.get(`/github-integration/${idUsuario}`),
  create:       (data)       => api.post('/github-integration', data),
  update:       (data)       => api.put('/github-integration', data),
  remove:       ()           => api.delete('/github-integration'),
};

export const agendaService = { calendar: (id) => api.get(`/agenda/${id}/calendario`), timeline: (id) => api.get(`/agenda/${id}/timeline`) };
export const passwordService = { request: (correo) => api.post('/auth/password-reset/request',{correo}), confirm: (token,nueva_contrasena) => api.post('/auth/password-reset/confirm',{token,nueva_contrasena}) };

// ── Solicitudes al Administrador (NUEVO) ──────────────
export const solicitudesService = {
  tipos:    ()            => api.get('/solicitudes/tipos'),
  mias:     ()            => api.get('/solicitudes/mias'),
  getAll:   (params = {}) => api.get('/solicitudes', { params }),
  create:   (data)        => api.post('/solicitudes', data),
  resolver: (id, estado, respuesta) => api.put(`/solicitudes/${id}/resolver`, { estado, respuesta }),
};
