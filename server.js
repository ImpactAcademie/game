const http = require('node:http');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const index = readFileSync(join(__dirname, 'index.html'));
const scripts = new Map([
  ['/panther.js', readFileSync(join(__dirname, 'panther.js'))],
  ...['three.module.js', 'three.core.js'].map((file) => [
    '/' + file,
    readFileSync(join(__dirname, 'node_modules', 'three', 'build', file)),
  ]),
]);
const port = Number(process.env.PORT ?? 3000);

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  const isPage = pathname === '/' || pathname === '/index.html';
  const body = isPage ? index : scripts.get(pathname);

  if (!body) {
    response.writeHead(404).end();
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  const contentType = isPage ? 'text/html' : 'text/javascript';
  response.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' });
  response.end(body);
});

server.listen(port, () => {
  console.log(`http://localhost:${server.address().port}`);
});
