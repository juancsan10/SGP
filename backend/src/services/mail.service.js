/**
 * Envío de correos (nodemailer).
 *
 * Modos (variable MAIL_MODE):
 *  - "smtp"    : envía por SMTP real (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM).
 *  - "console" : NO envía; imprime el correo en la consola del backend. Solo para desarrollo.
 * Si MAIL_MODE no se define: "smtp" cuando hay SMTP_HOST, de lo contrario "console".
 *
 * IMPORTANTE: el código de recuperación jamás se devuelve por la API; solo viaja por correo.
 */
const nodemailer = require('nodemailer');

function modo() {
  if (process.env.MAIL_MODE) return process.env.MAIL_MODE;
  return process.env.SMTP_HOST ? 'smtp' : 'console';
}

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function plantillaCodigo({ nombre, codigo, minutos }) {
  const texto = `Hola ${nombre},\n\nTu código para recuperar la contraseña de SGP SENA es: ${codigo}\n\nVence en ${minutos} minutos y solo se puede usar una vez.\nSi no lo solicitaste, ignora este mensaje: tu contraseña no cambiará.\n`;
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
<table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#059669;color:#fff;padding:20px 28px;font-size:18px;font-weight:700">SGP SENA · Recuperar contraseña</td></tr>
<tr><td style="padding:28px;color:#0f172a;font-size:15px;line-height:1.55">
<p style="margin:0 0 12px">Hola <b>${esc(nombre)}</b>,</p>
<p style="margin:0 0 18px">Usa este código para continuar con la recuperación de tu contraseña:</p>
<div style="text-align:center;margin:0 0 18px"><span style="display:inline-block;background:#ecfdf5;border:2px dashed #059669;color:#065f46;font-size:34px;letter-spacing:10px;font-weight:800;padding:14px 22px;border-radius:12px">${esc(codigo)}</span></div>
<p style="margin:0 0 8px">⏱ Vence en <b>${minutos} minutos</b> y solo se puede usar <b>una vez</b>.</p>
<p style="margin:0;color:#64748b;font-size:13px">Si no fuiste tú, ignora este correo: tu contraseña no cambiará. Nunca compartas este código con nadie.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { texto, html };
}

async function enviarCodigoRecuperacion({ para, nombre, codigo, minutos }) {
  const { texto, html } = plantillaCodigo({ nombre, codigo, minutos });
  if (modo() === 'console') {
    if (process.env.NODE_ENV === 'production') console.warn('[mail] MAIL_MODE=console: el código se imprime en logs. Configura SMTP para producción real.');
    console.log(`\n[mail:console] Para: ${para}\n[mail:console] Código de recuperación: ${codigo} (vence en ${minutos} min)\n`);
    return { enviado: false, consola: true };
  }
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || 'SGP SENA <no-reply@sgpsena.local>',
    to: para,
    subject: `Tu código de recuperación: ${codigo}`,
    text: texto,
    html,
  });
  return { enviado: true };
}

module.exports = { enviarCodigoRecuperacion };
