const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tareas.controller');
const { verifyToken, requireProjectMember } = require('../middlewares/auth.middleware');

router.post('/',              verifyToken, requireProjectMember('project-direct'), ctrl.create);
router.get('/:id_proyecto',   verifyToken, requireProjectMember('project-direct'), ctrl.getByProyecto);
router.put('/:id',            verifyToken, requireProjectMember('task'), ctrl.update);
router.delete('/:id',         verifyToken, requireProjectMember('task'), ctrl.remove);

module.exports = router;
