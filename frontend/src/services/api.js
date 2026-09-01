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
    // Token expirado → redirigir al login
    if (error.response?.status === 401) {
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
};

// ── Usuarios ──────────────────────────────────────────
export const usuariosService = {
  getAll:   ()         => api.get('/usuarios'),
  getById:  (id)       => api.get(`/usuarios/${id}`),
  update:   (id, data) => api.put(`/usuarios/${id}`, data),
  remove:   (id)       => api.delete(`/usuarios/${id}`),
};

// ── Proyectos ─────────────────────────────────────────
export const proyectosService = {
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
  remove:        (id)      => api.delete(`/equipos/${id}`),
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
  create:        (data)    => api.post('/tareas', data),
  update:        (id, data)=> api.put(`/tareas/${id}`, data),
  remove:        (id)      => api.delete(`/tareas/${id}`),
};

// ── Mensajes ──────────────────────────────────────────
export const mensajesService = {
  getByProyecto: (idProy)  => api.get(`/mensajes/${idProy}`),
  create:        (data)    => api.post('/mensajes', data),
};

// ── Notificaciones ────────────────────────────────────
export const notificacionesService = {
  getByUsuario:     (idUsr)  => api.get(`/notificaciones/${idUsr}`),
  marcarLeida:      (id)     => api.put(`/notificaciones/${id}`),
  marcarTodasLeidas:(idUsr)  => api.put(`/notificaciones/leer-todas/${idUsr}`),
};

// ── Repositorios ──────────────────────────────────────
export const repositoriosService = {
  getByProyecto: (idProy)  => api.get(`/repositorios/${idProy}`),
  create:        (data)    => api.post('/repositorios', data),
  update:        (id, data)=> api.put(`/repositorios/${id}`, data),
};

// ── Historial ─────────────────────────────────────────
export const historialService = {
  getAll:     ()       => api.get('/historial'),
  getByTabla: (tabla)  => api.get(`/historial/${tabla}`),
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
};

// ── Evaluaciones (NUEVO — RN-016) ──────────────────────
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
