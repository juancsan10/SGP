const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const register = async (req,res) => {
  try {
    const {nombres,apellidos,correo,contrasena,ficha,programa_formacion}=req.body;
    if(!nombres||!apellidos||!correo||!contrasena) return res.status(400).json({success:false,message:'Todos los campos obligatorios son requeridos'});
    if(contrasena.length<8) return res.status(400).json({success:false,message:'La contraseña debe tener al menos 8 caracteres'});
    const [existe]=await db.query('SELECT id_usuario FROM usuarios WHERE correo=?',[correo]);
    if(existe.length) return res.status(400).json({success:false,message:'El correo ya está registrado'});
    const hashed=await bcrypt.hash(contrasena,10);
    const [result]=await db.query('INSERT INTO usuarios (nombres,apellidos,correo,contrasena,ficha,programa_formacion,id_rol) VALUES (?,?,?,?,?,?,3)',[nombres,apellidos,correo,hashed,ficha||null,programa_formacion||null]);
    res.status(201).json({success:true,message:'Usuario registrado exitosamente como Aprendiz',data:{id_usuario:result.insertId}});
  } catch(err){ console.error(err); res.status(500).json({success:false,message:'Error interno del servidor'}); }
};

const login=async(req,res)=>{
 try{
  const {correo,contrasena}=req.body;
  if(!correo||!contrasena) return res.status(400).json({success:false,message:'Correo y contraseña son requeridos'});
  const [rows]=await db.query(`SELECT u.id_usuario,u.nombres,u.apellidos,u.correo,u.contrasena,u.ficha,u.programa_formacion,u.id_rol,r.nombre_rol AS rol FROM usuarios u JOIN roles r ON u.id_rol=r.id_rol WHERE u.correo=? AND u.estado=1`,[correo]);
  if(!rows.length) return res.status(401).json({success:false,message:'Credenciales inválidas o usuario inactivo'});
  const u=rows[0]; if(!(await bcrypt.compare(contrasena,u.contrasena))) return res.status(401).json({success:false,message:'Credenciales inválidas'});
  const token=jwt.sign({id:u.id_usuario,correo:u.correo,rol:u.rol,id_rol:u.id_rol},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'2h'});
  res.json({success:true,message:'Inicio de sesión exitoso',data:{token,usuario:{id:u.id_usuario,nombres:u.nombres,apellidos:u.apellidos,correo:u.correo,rol:u.rol,ficha:u.ficha,programa_formacion:u.programa_formacion}}});
 }catch(err){console.error(err);res.status(500).json({success:false,message:'Error interno del servidor'});}
};

const requestPasswordReset=async(req,res)=>{
 try{
  const {correo}=req.body; if(!correo) return res.status(400).json({success:false,message:'El correo es requerido'});
  const [users]=await db.query('SELECT id_usuario FROM usuarios WHERE correo=? AND estado=1',[correo]);
  if(!users.length) return res.json({success:true,message:'Si el correo existe, se generó un enlace de recuperación'});
  const token=crypto.randomBytes(32).toString('hex');
  await db.query('DELETE FROM password_reset_tokens WHERE id_usuario=? OR expires_at<NOW()',[users[0].id_usuario]);
  await db.query('INSERT INTO password_reset_tokens (id_usuario,token,expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))',[users[0].id_usuario,token]);
  const base=process.env.FRONTEND_URL||'http://localhost:5173';
  res.json({success:true,message:'Enlace de recuperación generado',data:{reset_url:`${base}/reset-password?token=${token}`}});
 }catch(err){console.error(err);res.status(500).json({success:false,message:'Error interno del servidor'});}
};

const resetPassword=async(req,res)=>{
 try{
  const {token,nueva_contrasena}=req.body; if(!token||!nueva_contrasena) return res.status(400).json({success:false,message:'Token y nueva contraseña son requeridos'});
  if(nueva_contrasena.length<8) return res.status(400).json({success:false,message:'La contraseña debe tener al menos 8 caracteres'});
  const [rows]=await db.query('SELECT id_usuario FROM password_reset_tokens WHERE token=? AND used=0 AND expires_at>NOW()',[token]);
  if(!rows.length) return res.status(400).json({success:false,message:'Token inválido o expirado'});
  const hash=await bcrypt.hash(nueva_contrasena,10);
  await db.query('UPDATE usuarios SET contrasena=? WHERE id_usuario=?',[hash,rows[0].id_usuario]);
  await db.query('UPDATE password_reset_tokens SET used=1 WHERE token=?',[token]);
  res.json({success:true,message:'Contraseña actualizada correctamente'});
 }catch(err){console.error(err);res.status(500).json({success:false,message:'Error interno del servidor'});}
};

const createUserByAdmin=async(req,res)=>{
 try{
  const {nombres,apellidos,correo,contrasena,ficha,programa_formacion,id_rol}=req.body;
  if(!nombres||!apellidos||!correo||!contrasena||![1,2].includes(Number(id_rol))) return res.status(400).json({success:false,message:'Datos inválidos. El rol debe ser Administrador (1) o Instructor (2)'});
  const [exists]=await db.query('SELECT id_usuario FROM usuarios WHERE correo=?',[correo]); if(exists.length) return res.status(400).json({success:false,message:'El correo ya está registrado'});
  const hash=await bcrypt.hash(contrasena,10);
  const [r]=await db.query('INSERT INTO usuarios (nombres,apellidos,correo,contrasena,ficha,programa_formacion,id_rol) VALUES (?,?,?,?,?,?,?)',[nombres,apellidos,correo,hash,ficha||null,programa_formacion||null,id_rol]);
  res.status(201).json({success:true,message:'Usuario creado',data:{id_usuario:r.insertId}});
 }catch(err){console.error(err);res.status(500).json({success:false,message:'Error interno del servidor'});}
};
module.exports={register,login,requestPasswordReset,resetPassword,createUserByAdmin};
