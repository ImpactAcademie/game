const http = require('node:http');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const index = readFileSync(join(__dirname, 'index.html'));
const port = Number(process.env.PORT ?? 3000);

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (pathname !== '/' && pathname !== '/index.html') {
    response.writeHead(404).end();
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(index);
});

server.listen(port, () => {
  console.log(`http://localhost:${server.address().port}`);
});
