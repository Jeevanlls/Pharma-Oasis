// Isolated launch rehearsal: fixed disposable Neon branch; fictional customer;
// no mail credentials, inventory bridge, scheduled jobs, or staff access.
import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import pg from "pg";
if (process.env.CATALOGUE_REHEARSAL !== "true" || process.env.ZOHO_EMAIL_PASSWORD || process.env.INVENTORY_API_TOKEN)
    throw new Error("Rehearsal must be isolated from mail and inventory.");
const connection = new pg.Client({ connectionString: process.env.NEON_DATABASE_URL });
await connection.connect();
const check = await connection.query("SELECT current_setting('neon.branch_id') branch");
if (check.rows[0].branch !== "br-raspy-star-abmxj101")
    throw new Error("Refusing to rehearse against another database.");
if (!process.env.REHEARSAL_PASSWORD_HASH)
    throw new Error("Missing rehearsal password hash.");
await connection.query(`INSERT INTO users(email,password_hash,role,status,company_name,primary_contact_name)
 VALUES('catalogue-test@example.invalid',$1,'customer','active','Catalogue Test Company','Launch Test')
 ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash`, [process.env.REHEARSAL_PASSWORD_HASH]);
await connection.end();
const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use((_req, res, next) => { res.setHeader("X-Robots-Tag", "noindex, nofollow"); next(); });
app.get('/objects/*', async (req, res) => {
    try {
        const upstream=await fetch('https://pharmaoasis.co.uk'+req.path);
        if(!upstream.ok) return res.sendStatus(upstream.status);
        res.type(upstream.headers.get('content-type')||'application/octet-stream');
        res.setHeader('Cache-Control','public, max-age=3600');
        res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch { res.sendStatus(502); }
});
app.get('/healthz', (_req, res) => res.send('OK'));
app.use((req, res, next) => {
    if (req.path.startsWith('/api/admin') || req.path === '/staff' || req.path.startsWith('/api/auth/2fa') || req.path === '/api/register')
        return res.status(403).json({ message: "Unavailable in launch rehearsal." });
    if (req.path === '/api/auth/login' && req.body?.email !== 'catalogue-test@example.invalid')
        return res.status(403).json({ message: "Fictional rehearsal account only." });
    if (req.path.startsWith('/api/') && !/^\/api\/(products|brands|categories|trade\/commercial-range|site-settings|offers|auth\/(me|login|logout)|quotes|portal\/(products|brands|categories|orders|quotes|promotions))($|\/|\?)/.test(req.path))
        return res.status(403).json({ message: "Unavailable in launch rehearsal." });
    next();
});
const server = createServer(app);
const { registerRoutes } = await import('../server/routes');
await registerRoutes(server, app);
app.use(express.static(path.resolve('dist/public')));
app.get('*', (_req, res) => res.sendFile(path.resolve('dist/public/index.html')));
server.listen(Number(process.env.PORT || 10000), '0.0.0.0');

// Exercise the same metadata-only sync against the fixed test branch.
if(process.env.APP_CATALOGUE_DATABASE_URL){
 const {syncCatalogue}=await import('../server/catalogue-sync');
 void syncCatalogue().then(result=>console.log('REHEARSAL SYNC COMPLETE',JSON.stringify(result))).catch(error=>console.error('REHEARSAL SYNC FAILED',error.message));
}
