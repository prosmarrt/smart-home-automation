import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const includeExtensions = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.sql', '.css', '.html', '.md',
  '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico'
]);

const binaryExtensions = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.ico', '.pdf'
]);

const excludePaths = [
  'node_modules',
  'dist',
  '.git',
  '.skills',
  'public/backup',
  'historical_context.txt'
];

function shouldExclude(relPath) {
  return excludePaths.some(ex => relPath === ex || relPath.startsWith(ex + '/') || relPath.startsWith(ex + '\\'));
}

const bundle = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  files: {}
};

function walkDir(dir, baseDir = rootDir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (shouldExclude(relPath)) continue;

    if (entry.isDirectory()) {
      walkDir(fullPath, baseDir);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      // Allow known extensions or special config files
      const isConfigFile = entry.name.startsWith('.') || ['Dockerfile', 'Makefile'].includes(entry.name);
      if (includeExtensions.has(ext) || isConfigFile) {
        try {
          if (binaryExtensions.has(ext)) {
            const buf = fs.readFileSync(fullPath);
            bundle.files[relPath] = {
              type: 'base64',
              encoding: 'base64',
              content: buf.toString('base64'),
              size: buf.length
            };
          } else {
            const content = fs.readFileSync(fullPath, 'utf8');
            bundle.files[relPath] = {
              type: 'text',
              content,
              size: Buffer.byteLength(content, 'utf8')
            };
          }
        } catch (err) {
          console.warn(`Could not read ${relPath}:`, err.message);
        }
      }
    }
  }
}

console.log('Generating app source bundle...');
walkDir(rootDir);

const outDir = path.join(rootDir, 'public', 'backup');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, 'appSourceBundle.json');
fs.writeFileSync(outPath, JSON.stringify(bundle), 'utf8');
const fileCount = Object.keys(bundle.files).length;
const bundleStats = fs.statSync(outPath);

console.log(`✓ App source bundle created: ${fileCount} files, ${(bundleStats.size / (1024 * 1024)).toFixed(2)} MB at ${outPath}`);
