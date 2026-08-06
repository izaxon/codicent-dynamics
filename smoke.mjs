import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const expectedFiles = new Set([
  '.github/workflows/pages.yml',
  '.nojekyll',
  'CNAME',
  'README.md',
  'index.html',
  'smoke.mjs',
]);

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [relative(root, fullPath).replaceAll('\\', '/')];
  });
}

const actualFiles = filesUnder(root).filter((file) => !file.startsWith('.git/'));
for (const file of actualFiles) {
  if (!expectedFiles.has(file)) throw new Error(`Unexpected file in public artifact: ${file}`);
}
for (const file of expectedFiles) {
  if (!existsSync(resolve(root, file)) || !statSync(resolve(root, file)).isFile()) {
    throw new Error(`Missing required public file: ${file}`);
  }
}

const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const required = [
  '<title>Codicent Dynamics CRM MCP',
  'Read-oriented from the start',
  'Private implementation',
  'Customer-service context',
  'mailto:johan@codicent.com',
  'not affiliated with or endorsed by Microsoft',
];
for (const value of required) {
  if (!html.includes(value)) throw new Error(`Missing required site content: ${value}`);
}

// The guard source necessarily names the prohibited patterns, so scan every
// publishable content/config file except this guard itself.
const allText = actualFiles
  .filter((file) => file !== 'smoke.mjs')
  .map((file) => readFileSync(resolve(root, file), 'utf8'))
  .join('\n');
const forbidden = [
  /DYNAMICS_(?:BASE_URL|RESOURCE|TENANT_ID|CLIENT_ID|CLIENT_SECRET)/i,
  /AUTH_TOKEN_URL/i,
  /client[_-]?secret\s*[=:]/i,
  /(?:github_pat|ghp_|sk-)[A-Za-z0-9_-]{12,}/i,
  /login\.microsoftonline\.com/i,
  /\.crm\d*\.dynamics\.com\/api\/data/i,
  /localhost:\d+/i,
  /\/mcp\b/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
];
for (const pattern of forbidden) {
  if (pattern.test(allText)) throw new Error(`Public site contains prohibited implementation or secret material: ${pattern}`);
}

if ((html.match(/<h1\b/g) ?? []).length !== 1) throw new Error('Public site must contain exactly one h1');
if (/<script\b[^>]*src=/i.test(html)) throw new Error('Public site must not load third-party scripts');

console.log('Dynamics CRM public-site checks passed');
