const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const DIST_BACKEND_DIR = path.join(DIST_DIR, 'backend');
const DIST_NODE_DIR = path.join(DIST_DIR, 'nodejs');

// Keep the packaged runtime aligned with backend/package.json engines.node.
const NODE_VERSION = process.env.NODE_VERSION || '22.14.0';
const NODE_ARCHIVE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`;
const NODE_ARCHIVE_PATH = path.join(DIST_DIR, 'node.zip');

const EXCLUDED_BACKEND_ENTRIES = new Set([
  'node_modules',
  'public',
  'db',
  'cache',
  'logs',
  '.env',
  '.env.local'
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest, exclude = () => false) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude(entry)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, exclude);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function run(command, args, options = {}) {
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  execFileSync(executable, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  });
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, response => {
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        download(response.headers.location, destination).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Node.js download failed with HTTP ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(destination);
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', error => {
        file.destroy();
        reject(error);
      });
    });
    request.on('error', reject);
  });
}

async function ensurePortableNode() {
  if (process.platform !== 'win32') {
    throw new Error('The Windows release package must be built on Windows.');
  }

  if (fs.existsSync(path.join(DIST_NODE_DIR, 'node.exe'))) return;

  ensureDir(DIST_DIR);
  console.log(`Downloading Node.js v${NODE_VERSION}...`);
  await download(NODE_ARCHIVE_URL, NODE_ARCHIVE_PATH);
  execFileSync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    `Expand-Archive -LiteralPath '${NODE_ARCHIVE_PATH}' -DestinationPath '${DIST_DIR}' -Force`
  ], { stdio: 'inherit' });

  const extractedDir = path.join(DIST_DIR, `node-v${NODE_VERSION}-win-x64`);
  copyDir(extractedDir, DIST_NODE_DIR);
  fs.rmSync(extractedDir, { recursive: true, force: true });
  fs.rmSync(NODE_ARCHIVE_PATH, { force: true });
}

function writeRuntimeEnv() {
  const env = {
    PORT: process.env.PORT || '3000',
    HOST: process.env.HOST || 'localhost',
    NODE_ENV: 'production',
    DB_TYPE: process.env.DB_TYPE || 'sqlite',
    DATABASE_URL: process.env.DATABASE_URL || '',
    DB_PATH: process.env.DB_PATH || './db/poetry.db',
    JWT_SECRET: process.env.JWT_SECRET || '',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*',
    ZHIPU_API_KEY: process.env.ZHIPU_API_KEY || '',
    ZHIPU_MODEL: process.env.ZHIPU_MODEL || 'GLM-4-Flash-250414',
    SPARK_API_PASSWORD: process.env.SPARK_API_PASSWORD || '',
    SPARK_MODEL: process.env.SPARK_MODEL || 'lite',
    ALIYUN_BAILIAN_API_KEY: process.env.ALIYUN_BAILIAN_API_KEY || '',
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY || '',
    SILICONFLOW_API_KEY: process.env.SILICONFLOW_API_KEY || ''
  };

  const content = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n';
  fs.writeFileSync(path.join(DIST_BACKEND_DIR, '.env'), content, 'utf8');
}

function writeStartScript() {
  fs.writeFileSync(path.join(DIST_DIR, 'start.bat'), `@echo off
chcp 65001 >nul
title SoulSync-Poetry
pushd "%~dp0backend"
start "" http://localhost:3000
"%~dp0nodejs\\node.exe" server.js
popd
pause
`, 'utf8');
}

async function build() {
  console.log('Building frontend...');
  run('npm', ['run', 'build'], { cwd: FRONTEND_DIR });

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  ensureDir(DIST_BACKEND_DIR);

  console.log('Copying backend source...');
  copyDir(BACKEND_DIR, DIST_BACKEND_DIR, entry => EXCLUDED_BACKEND_ENTRIES.has(entry.name));
  copyDir(path.join(BACKEND_DIR, 'public'), path.join(DIST_BACKEND_DIR, 'public'));
  // 闯关服务在运行时需要与前端共用同一份权威题库。
  const challengeDataTarget = path.join(DIST_BACKEND_DIR, 'src', 'data', 'poetryLevels.json');
  ensureDir(path.dirname(challengeDataTarget));
  fs.copyFileSync(path.join(FRONTEND_DIR, 'src', 'data', 'poetryLevels.json'), challengeDataTarget);
  ensureDir(path.join(DIST_BACKEND_DIR, 'db'));

  console.log('Installing production dependencies...');
  run('npm', ['ci', '--omit=dev'], { cwd: DIST_BACKEND_DIR });

  writeRuntimeEnv();
  await ensurePortableNode();
  writeStartScript();

  console.log(`Release package created at ${DIST_DIR}`);
}

build().catch(error => {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
});
