const http = require('node:http');
const { readFileSync, renameSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const gameFiles = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/camera.js', 'camera.js'],
  ['/panther.js', 'panther.js'],
  ['/internet_assets/black-panther.glb', 'internet_assets/Black Panther by Google Data Arts Team - JcAlAQynld.glb'],
]);
const scripts = new Map([
  ...['loaders/GLTFLoader.js', 'utils/BufferGeometryUtils.js', 'utils/SkeletonUtils.js'].map((file) => [
    '/' + file,
    readFileSync(join(__dirname, 'node_modules', 'three', 'examples', 'jsm', file)),
  ]),
  ...['three.module.js', 'three.core.js'].map((file) => [
    '/' + file,
    readFileSync(join(__dirname, 'node_modules', 'three', 'build', file)),
  ]),
]);
const port = Number(process.env.PORT ?? 3000);
const scoresFile = join(__dirname, 'json.db');

function sendJSON(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

async function handleScores(request, response) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.writeHead(405, { Allow: 'GET, POST' }).end();
    return;
  }

  try {
    let distance;
    if (request.method === 'POST') {
      let body = '';
      let bodySize = 0;
      for await (const chunk of request) {
        bodySize += chunk.length;
        if (bodySize <= 1024) body += chunk.toString();
      }
      if (bodySize > 1024) {
        sendJSON(response, 413, { error: 'Requête trop grande' });
        return;
      }
      try {
        distance = JSON.parse(body)?.distance;
      } catch {
        distance = undefined;
      }
      if (!Number.isFinite(distance) || distance < 0 || distance > Number.MAX_SAFE_INTEGER / 10) {
        sendJSON(response, 400, { error: 'Distance invalide' });
        return;
      }
    }

    const scores = JSON.parse(readFileSync(scoresFile, 'utf8'));
    if (request.method === 'POST') {
      scores.push({ distance: Math.round(distance * 10) / 10, date: new Date().toISOString() });
      const pendingFile = scoresFile + '.tmp';
      writeFileSync(pendingFile, JSON.stringify(scores, null, 2) + '\n');
      renameSync(pendingFile, scoresFile);
    }
    scores.sort((a, b) => b.distance - a.distance);
    sendJSON(response, request.method === 'POST' ? 201 : 200, { scores: scores.slice(0, 10) });
  } catch (error) {
    console.error(error);
    sendJSON(response, 500, { error: 'Classement indisponible' });
  }
}

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/api/scores') return handleScores(request, response);

  const isPage = pathname === '/' || pathname === '/index.html';
  const gameFile = gameFiles.get(pathname);
  const script = scripts.get(pathname);

  if (!gameFile && !script) {
    response.writeHead(404).end();
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  const contentType = gameFile?.endsWith('.glb')
    ? 'model/gltf-binary'
    : (isPage ? 'text/html' : 'text/javascript') + '; charset=utf-8';
  let body = script;
  if (gameFile) {
    try {
      body = readFileSync(join(__dirname, gameFile));
    } catch (error) {
      console.error(error);
      response.writeHead(500).end();
      return;
    }
  }
  response.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
  });
  response.end(body);
});

server.listen(port, () => {
  console.log(`http://localhost:${server.address().port}`);
});
