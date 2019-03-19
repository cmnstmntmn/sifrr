const { App } = require('../../../src/sifrr.server');
const path = require('path');

const app = new App();
app.folder('/', path.join(__dirname, 'public'), {
  headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': '*'
  },
  compress: false
});
app.folder('/', path.join(__dirname, 'public/compress'), {
  headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': '*'
  },
  compress: true
});

module.exports = app;