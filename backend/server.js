require('dotenv').config();
const required=['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD','JWT_SECRET','FRONTEND_URL'];
if(process.env.NODE_ENV==='production') {
  for(const key of required) if(!process.env[key]) throw new Error(`Falta variable obligatoria: ${key}`);
  if(process.env.JWT_SECRET.length<32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
}
const app=require('./src/app');
const db=require('./src/config/db');
const {runExpirationAlerts}=require('./src/services/alerts.service');
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>{ console.log(`🚀 SGP API en http://localhost:${PORT}`); runExpirationAlerts().catch(console.error); setInterval(()=>runExpirationAlerts().catch(console.error),60*60*1000); });
