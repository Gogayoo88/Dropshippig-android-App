const { spawn } = require('child_process');

function configureDatabase() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is missing');
  const u = new URL(raw);
  process.env.DB_TYPE = 'postgresdb';
  process.env.DB_POSTGRESDB_HOST = u.hostname;
  process.env.DB_POSTGRESDB_PORT = u.port || '5432';
  process.env.DB_POSTGRESDB_DATABASE = decodeURIComponent(u.pathname.replace(/^\//, ''));
  process.env.DB_POSTGRESDB_USER = decodeURIComponent(u.username);
  process.env.DB_POSTGRESDB_PASSWORD = decodeURIComponent(u.password);
  process.env.DB_POSTGRESDB_SCHEMA = 'public';
}

configureDatabase();

const host = process.env.RENDER_EXTERNAL_HOSTNAME;
process.env.N8N_PORT = process.env.PORT || '10000';
process.env.N8N_PROTOCOL = host ? 'https' : 'http';
if (host) {
  process.env.N8N_HOST = host;
  process.env.WEBHOOK_URL = `https://${host}/`;
  process.env.N8N_EDITOR_BASE_URL = `https://${host}/`;
}

const child = spawn('n8n', ['start'], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
