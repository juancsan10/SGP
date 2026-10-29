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

// ───────────── Recuperación de contraseña (3 pasos) ─────────────
// 1) request : genera un código de 6 dígitos (3 min) y lo envía SOLO al correo de la cuenta.
// 2) verify  : valida el código (máx. 5 intentos) y entrega una sesión de 5 min que HABILITA el cambio.
// 3) confirm : con la sesión válida fija la nueva contraseña. Todo es de un solo uso.
const RESET_TTL_MIN = 3;
const RESET_SESSION_MIN = 5;
const RESET_MAX_INTENTOS = 5;
const RESET_COOLDOWN_SEG = 60;
const RESPUESTA_GENERICA = 'Si el correo está registrado, enviamos un código de verificación a esa dirección.';

const hmac = (v) => crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev-secret').update(String(v)).digest('hex');
const iguales = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const err500 = (res, err) => { console.error(err); res.status(500).json({ success: false, message: 'Error interno del servidor' }); };

const requestPasswordReset = async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ success: false, message: 'El correo es requerido' });
    const respuesta = { success: true, message: RESPUESTA_GENERICA, data: { expires_in: RESET_TTL_MIN * 60, resend_in: RESET_COOLDOWN_SEG } };
    const [users] = await db.query('SELECT id_usuario,nombres FROM usuarios WHERE correo=? AND estado=1', [correo]);
    if (!users.length) {
      // Misma respuesta y misma espera aproximada: no revela si el correo existe.
      await new Promise((r) => setTimeout(r, 250 + Math.random() * 150));
      return res.json(respuesta);
    }
    const u = users[0];
    const [recientes] = await db.query(
      'SELECT TIMESTAMPDIFF(SECOND,created_at,NOW()) AS seg FROM password_reset_tokens WHERE id_usuario=? ORDER BY id_token DESC LIMIT 1', [u.id_usuario]);
    if (recientes.length && recientes[0].seg < RESET_COOLDOWN_SEG) {
      return res.status(429).json({ success: false, message: `Espera ${RESET_COOLDOWN_SEG - recientes[0].seg} s para pedir otro código.`, data: { retry_after: RESET_COOLDOWN_SEG - recientes[0].seg } });
    }
    const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await db.query('DELETE FROM password_reset_tokens WHERE id_usuario=? OR expires_at<DATE_SUB(NOW(),INTERVAL 1 DAY)', [u.id_usuario]);
    await db.query('INSERT INTO password_reset_tokens (id_usuario,token_hash,expires_at,ip) VALUES (?,?,DATE_ADD(NOW(),INTERVAL ? MINUTE),?)',
      [u.id_usuario, hmac(`${u.id_usuario}:${codigo}`), RESET_TTL_MIN, req.ip]);
    try {
      await require('../services/mail.service').enviarCodigoRecuperacion({ para: correo, nombre: u.nombres, codigo, minutos: RESET_TTL_MIN });
    } catch (mailErr) {
      console.error('[mail] No se pudo enviar el correo de recuperación:', mailErr.message);
    }
    res.json(respuesta);
  } catch (err) { err500(res, err); }
};

const verifyResetCode = async (req, res) => {
  try {
    const { correo, token } = req.body;
    const malo = (msg, extra = {}) => res.status(400).json({ success: false, message: msg, data: extra });
    const [users] = await db.query('SELECT id_usuario FROM usuarios WHERE correo=? AND estado=1', [correo]);
    if (!users.length) return malo('Código inválido o vencido.');
    const id = users[0].id_usuario;
    const [rows] = await db.query('SELECT id_token,token_hash,intentos,(expires_at>NOW()) AS vigente FROM password_reset_tokens WHERE id_usuario=? AND used=0 AND verificado_at IS NULL ORDER BY id_token DESC LIMIT 1', [id]);
    if (!rows.length || !rows[0].vigente) return malo('El código venció. Solicita uno nuevo.', { expired: true });
    const r = rows[0];
    if (r.intentos >= RESET_MAX_INTENTOS) return malo('Demasiados intentos. Solicita un código nuevo.', { locked: true });
    if (!iguales(r.token_hash, hmac(`${id}:${token}`))) {
      await db.query('UPDATE password_reset_tokens SET intentos=intentos+1 WHERE id_token=?', [r.id_token]);
      const quedan = RESET_MAX_INTENTOS - (r.intentos + 1);
      if (quedan <= 0) await db.query('UPDATE password_reset_tokens SET expires_at=NOW() WHERE id_token=?', [r.id_token]);
      return malo(quedan > 0 ? `Código incorrecto. Te quedan ${quedan} intento${quedan === 1 ? '' : 's'}.` : 'Demasiados intentos. Solicita un código nuevo.', { attempts_left: Math.max(quedan, 0), locked: quedan <= 0 });
    }
    const sesion = crypto.randomBytes(32).toString('hex');
    await db.query('UPDATE password_reset_tokens SET verificado_at=NOW(),sesion_hash=?,sesion_expires_at=DATE_ADD(NOW(),INTERVAL ? MINUTE) WHERE id_token=?', [hmac(sesion), RESET_SESSION_MIN, r.id_token]);
    res.json({ success: true, message: 'Código verificado. Ya puedes elegir tu nueva contraseña.', data: { reset_session: sesion, session_expires_in: RESET_SESSION_MIN * 60 } });
  } catch (err) { err500(res, err); }
};

const resetPassword = async (req, res) => {
  try {
    const { correo, reset_session, nueva_contrasena } = req.body;
    const [users] = await db.query('SELECT id_usuario FROM usuarios WHERE correo=? AND estado=1', [correo]);
    const invalido = () => res.status(400).json({ success: false, message: 'La sesión de recuperación no es válida o venció. Vuelve a empezar.' });
    if (!users.length) return invalido();
    const id = users[0].id_usuario;
    const [rows] = await db.query('SELECT id_token,sesion_hash FROM password_reset_tokens WHERE id_usuario=? AND used=0 AND verificado_at IS NOT NULL AND sesion_expires_at>NOW() ORDER BY id_token DESC LIMIT 1', [id]);
    if (!rows.length || !iguales(rows[0].sesion_hash, hmac(reset_session))) return invalido();
    const hash = await bcrypt.hash(nueva_contrasena, 10);
    await db.query('UPDATE usuarios SET contrasena=? WHERE id_usuario=?', [hash, id]);
    await db.query('UPDATE password_reset_tokens SET used=1,sesion_hash=NULL WHERE id_usuario=?', [id]);
    res.json({ success: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (err) { err500(res, err); }
};

const createUserByAdmin=async(req,res)=>{
 try{
  const {nombres,apellidos,correo,contrasena,ficha,programa_formacion,id_rol,identificacion}=req.body;
  if(!nombres||!apellidos||!correo||!contrasena||![1,2].includes(Number(id_rol))) return res.status(400).json({success:false,message:'Datos inválidos. El rol debe ser Administrador (1) o Instructor (2)'});
  const [exists]=await db.query('SELECT id_usuario FROM usuarios WHERE correo=?',[correo]); if(exists.length) return res.status(400).json({success:false,message:'El correo ya está registrado'});
  if(identificacion){
    const [existeCc]=await db.query('SELECT id_usuario FROM usuarios WHERE identificacion=?',[identificacion]);
    if(existeCc.length) return res.status(400).json({success:false,message:'Ya existe un usuario con esa identificación'});
  }
  const hash=await bcrypt.hash(contrasena,10);
  const [r]=await db.query('INSERT INTO usuarios (nombres,apellidos,correo,contrasena,ficha,programa_formacion,id_rol,identificacion) VALUES (?,?,?,?,?,?,?,?)',[nombres,apellidos,correo,hash,ficha||null,programa_formacion||null,id_rol,identificacion||null]);
  res.status(201).json({success:true,message:'Usuario creado',data:{id_usuario:r.insertId}});
 }catch(err){console.error(err);res.status(500).json({success:false,message:'Error interno del servidor'});}
};
module.exports={register,login,requestPasswordReset,verifyResetCode,resetPassword,createUserByAdmin};
