const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/equipos.controller');
const { verifyToken, requireProjectMember } = require('../middlewares/auth.middleware');

router.post('/',                       verifyToken, requireProjectMember('project-direct'), ctrl.create);
router.get('/:id_proyecto',            verifyToken, requireProjectMember('project-direct'), ctrl.getByProyecto);
router.delete('/:id',                  verifyToken, requireProjectMember('team'), ctrl.remove);

module.exports = router;
