const express = require('express'),
  http2 = require('http2'),
  compression = require('compression'),
  serveStatic = require('serve-static'),
  staticTransform = require('connect-static-transform'),
  fs = require('fs'),
  path = require('path');

let port = false;
const index = Math.max(process.argv.indexOf('--port'), process.argv.indexOf('-p'));
if (index !== -1) {
  port = +process.argv[index + 1];
}

let dir = path.join(__dirname, '../../');
const diri = Math.max(process.argv.indexOf('--dir'), process.argv.indexOf('-d'));
if (diri !== -1) {
  dir = path.join(dir, process.argv[diri + 1]);
}

const server = express();

const instrumenter = require('istanbul-lib-instrument').createInstrumenter();
function staticTMiddleware(directory) {
  return staticTransform({
    root: directory,
    match: /.+\.js/,
    transform: function (path, text, send) {
      if (fs.existsSync(path + '.map')) {
        send(instrumenter.instrumentSync(text, path, JSON.parse(fs.readFileSync(path + '.map'))), { 'content-type': 'application/javascript; charset=UTF-8' });
      } else {
        send(text, { 'content-type': 'application/javascript; charset=UTF-8' });
      }
    }
  });
}

// export server for importing
const sss = function(port, dirS = dir) {
  server.use(compression());

  const toCover = process.env.COVERAGE === 'true';

  if (toCover) {
    server.use(staticTMiddleware(dirS));
    server.use(staticTMiddleware(path.join(dirS, '../../dist')));
    server.use(serveStatic(dirS));
  } else {
    // serve test public directories
    server.use(serveStatic(dirS));
    server.use(serveStatic(path.join(dirS, '../../dist')));
  }

  // serve sifrr-fetch and sifrr-dom
  const baseDir = path.join(__dirname, '../../');
  server.use(serveStatic(path.join(baseDir, './packages/browser/sifrr-dom/dist')));
  server.use(serveStatic(path.join(baseDir, './packages/browser/sifrr-fetch/dist')));
  process.stdout.write('Serving sifrr-dom and sifrr-fetch \n');

  server.get('/**404', (req, res) => res.sendStatus(404) && res.end());
  if (fs.existsSync(path.join(dirS, './index.html'))) {
    server.get('/**', (req, res) => res.sendFile(path.join(dirS, './index.html')));
  }

  const cert = fs.readFileSync(path.join(__dirname, './keys/server.crt'));
  const key = fs.readFileSync(path.join(__dirname, './keys/server.key'));

  const options = {
    cert,
    key,
    spdy: {
      protocols: [ 'h2', 'spdy/3.1', 'http/1.1' ]
    }
  };
  return http2.createSecureServer(
    options,
    server
  ).listen(port, () => global.console.log(`Listening on port ${port} and directories`, dirS));
};

// listen on port if port given
if (port) {
  sss(port);
}

module.exports = sss;
