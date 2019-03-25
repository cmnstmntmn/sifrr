const fs = require('fs');

const { okTest, SPORT } = require('./utils');
let sapp = require('../public/benchmarks/sifrr');

describe('speed test', function() {
  before(async () => {
    sapp.listen('localhost', SPORT, () => global.console.log('listening sifrr on ', SPORT));
    await page.goto(`${PATH}/static.html`);
  });

  after(() => {
    sapp.close();
  });

  it('serves base folder', async () => {
    assert.equal(await okTest(`http://localhost:${SPORT}/example.json`), true);
  });

  it('serves all subfolder folders recursively', async () => {
    assert.equal(await okTest(`http://localhost:${SPORT}/compress/compressed.html`), true);
  });

  it("doesn't serve non-existent files", async () => {
    assert.equal(await okTest(`http://localhost:${SPORT}/skjshfdk.html`), false);
  });

  it('serves with prefix', async () => {
    assert.equal(await okTest(`http://localhost:${SPORT}/p/example.json`), true);
  });

  it('serves files with pattern', async () => {
    assert.equal(await okTest(`http://localhost:${SPORT}/random/asdasd`), true);
  });

  it('serves newly created files and 404 for deleted files', async () => {
    const filePath = path.join(__dirname, '../public/abcd');

    fs.writeFileSync(filePath, '');
    await timeout(200);
    const resp = await page.goto(`${PATH}/abcd`);
    expect(resp.status()).to.equal(200);

    fs.unlinkSync(filePath);
    await timeout(200);
    const resp2 = await page.goto(`${PATH}/abcd`);
    expect(resp2.status()).to.equal(404);
  });

  it("doesn't respond with 304 when not modified and 200 when modified", async () => {
    await page.goto(`http://localhost:${SPORT}/p/example.json`);
    expect((await page.reload()).status()).to.equal(200);
  });

  // keep in last because different urls
  it('responds with 304 when not modified and 200 when modified', async () => {
    const filePath = path.join(__dirname, '../public/304.json');

    fs.writeFileSync(filePath, JSON.stringify({ ok: 'no' }));
    await page.goto(`${PATH}/304.json`);

    expect((await page.reload()).status()).to.equal(304);

    await timeout(1000);
    fs.writeFileSync(filePath, JSON.stringify({ ok: 'yes' }));

    expect((await page.reload()).status()).to.equal(200);
  });
});

function timeout(ms) {
  return new Promise(res => setTimeout(res, ms));
}
