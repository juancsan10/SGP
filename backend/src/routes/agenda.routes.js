const express=require('express');const router=express.Router();const ctrl=require('../controllers/agenda.controller');const {verifyToken,requireProjectMember}=require('../middlewares/auth.middleware');
router.get('/:id_proyecto/calendario',verifyToken,requireProjectMember('project-direct'),ctrl.calendar);
router.get('/:id_proyecto/timeline',verifyToken,requireProjectMember('project-direct'),ctrl.timeline);
module.exports=router;
