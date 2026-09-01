const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mensajes.controller');
const { verifyToken, requireProjectMember } = require('../middlewares/auth.middleware');

router.post('/',              verifyToken, requireProjectMember('project-direct'), ctrl.create);
router.get('/:id_proyecto',   verifyToken, requireProjectMember('project-direct'), ctrl.getByProyecto);

module.exports = router;
