# Frontend — SGP SENA

Aplicación en **React 18 + Vite + React Router + Axios**, conectada al backend Node/Express.

## Cómo levantarlo

Con el backend ya corriendo en `http://localhost:3000` (ver `../backend/README.md`):

```bash
cd frontend
npm install
npm run dev
```

Queda disponible en `http://localhost:5173`. En desarrollo, Vite hace de proxy: todo lo que
pega a `/api` se redirige automáticamente al backend en el puerto 3000 (configurado en
`vite.config.js`), así que no hay que tocar URLs a mano.

## Estructura

```
frontend/
├── index.html
├── vite.config.js
├── public/
└── src/
    ├── main.jsx
    ├── App.jsx              # árbol de rutas (públicas, privadas, solo admin/instructor)
    ├── context/
    │   └── AuthContext.jsx   # sesión, token JWT, rol del usuario
    ├── components/
    │   ├── AppLayout.jsx
    │   └── helpers.jsx
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── DashboardPage.jsx
    │   ├── ProyectosPage.jsx
    │   ├── ProyectoDetallePage.jsx
    │   ├── UsuariosPage.jsx
    │   ├── TareasPage.jsx
    │   ├── NotificacionesPage.jsx
    │   └── HistorialPage.jsx
    └── services/
        └── api.js            # cliente Axios centralizado + un service por entidad
```

## Notas

- El token JWT se guarda en `localStorage` (`sgp_token`); si el backend responde 401,
  la sesión se limpia y se redirige a `/login` automáticamente.
- Las páginas cubren las 11 entidades que el backend ya implementa. Si en el backend se
  agregan controladores para `comentarios`, `archivos`, `evaluaciones`, `reuniones` o
  `github_integration` (ver `../backend/README.md`), faltará su página/servicio correspondiente aquí.

## Plantillas HTML antiguas

Las plantillas HTML/CSS/JS estáticas del borrador original (por rol: admin, aprendiz,
instructor) se archivaron como referencia en
[`../docs/02-arquitectura/frontend-html-bases-legacy/`](../docs/02-arquitectura/frontend-html-bases-legacy/).
No se usan en la app actual — quedan solo de consulta.
