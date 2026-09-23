const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mensajes.controller');
const { verifyToken, requireProjectMember } = require('../middlewares/auth.middleware');

router.post('/',              verifyToken, requireProjectMember('project-direct'), ctrl.create);
// NUEVO: editar un mensaje propio. requireProjectMember confirma que el
// usuario pertenece al proyecto; la comprobación de que es SU mensaje
// (no el de otro miembro) ocurre dentro del controlador.
router.put('/:id',            verifyToken, requireProjectMember('message'), ctrl.update);
router.get('/:id_proyecto',   verifyToken, requireProjectMember('project-direct'), ctrl.getByProyecto);
// NUEVO: mensajes recientes para el Dashboard, sin depender de qué
// proyectos "ganaron" un recorte del lado del cliente. Cada rol ve el
// alcance correcto (Admin: todos; Instructor: los suyos; Aprendiz: los
// de su equipo) resuelto dentro del propio controlador.
router.get('/recientes/dashboard', verifyToken, ctrl.getRecientes);

module.exports = router;
