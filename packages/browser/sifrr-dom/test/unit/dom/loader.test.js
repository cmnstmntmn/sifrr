
describe('Loader', () => {
  afterEach(() => {
    const loader = require.resolve('../../../src/dom/loader');
    delete require.cache[loader];
    sinon.restore();
  });

  it('throws error if sifrr-fetch is not present', () => {
    const fetch = window.fetch;
    window.fetch = undefined;
    const Loader = require('../../../src/dom/loader');

    expect(() => new Loader()).to.throw();
    window.fetch = fetch;
  });

  it('returns loader if already present', () => {
    const Loader = require('../../../src/dom/loader');
    const a = {};
    Loader.all['random'] = a;

    expect(new Loader('random')).to.eq(a);
  });

  it('returns html and js if already present', () => {
    const Loader = require('../../../src/dom/loader');
    const l = new Loader('random', 'ok');
    const html = {}, js = {};
    l._html = html, l._js = js;

    expect(l.html).to.eq(html);
    expect(l.js).to.eq(js);
  });

  it('throws error on html execute script fail', async () => {
    const Loader = require('../../../src/dom/loader');
    const l = new Loader('random', 'ok');
    l._html = Promise.reject('err');

    l.executeHTMLScripts().should.be.rejectedWith('err');
  });
});
