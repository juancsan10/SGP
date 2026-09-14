const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/proyectos.controller');
const { verifyToken, requireRole, requireProjectMember, requireProjectManager } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { createProjectValidators, updateProjectValidators, pagination } = require('../validators/proyectos.validators');

router.post('/',     verifyToken, requireRole('Instructor','Administrador'), createProjectValidators, validate, ctrl.create);
router.get('/',      verifyToken, pagination, validate, ctrl.getAll);
router.get('/:id',   verifyToken, requireProjectMember('project'), updateProjectValidators.slice(0,1), validate, ctrl.getById);
router.put('/:id',   verifyToken, requireProjectManager('project'), updateProjectValidators, validate, ctrl.update);
router.delete('/:id',verifyToken, requireRole('Instructor','Administrador'), requireProjectManager('project'), updateProjectValidators.slice(0,1), validate, ctrl.remove);

module.exports = router;
