const Mocha = require('mocha');
const mkdirp = require('mkdirp');
const listen = require('./server');
const exec = require('../exec');
const testLoader = require('./testloader');
const inspector = require('inspector');

global.ENV = 'test';
global.fs = require('fs');
global.path = require('path');
global.chai = require('chai');
global.sinon = require('sinon').createSandbox();
global.assert = chai.assert;
global.expect = chai.expect;
global.should = chai.should();
global.puppeteer = require('puppeteer');
global.port = 8888;
global.PATH = `http://localhost:${port}`;

// check if should inspect or not
const shouldInspect = process.argv.indexOf('-i') > 0 || process.argv.indexOf('--inspect') > 0;
if (shouldInspect) inspector.open();

// Check if need coverage
const toCover = process.env.COVERAGE === 'true';
if (toCover) {
  const { createInstrumenter } = require('istanbul-lib-instrument');
  const instrumenter = createInstrumenter();
  const { hookRequire } = require('istanbul-lib-hook');
  hookRequire((filePath) => filePath.match(/packages\/[a-z]+\/sifrr-[a-z]+\/src/), (code, { filename }) => instrumenter.instrumentSync(code, filename));
}

const nycReport = path.join(__dirname, '../../.nyc_output');
const loadBrowser = async function() {
  // set browser and page global variables
  let pBrowser = await puppeteer.launch({
    // to make it work in circleci
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    headless: process.env.HEADLESS !== 'false',
    devtools: false
  });
  let page = await pBrowser.newPage();
  await page.setViewport( { width: 1280, height: 800} );
  global.browser = {
    current: pBrowser,
    close: async () => {
      if (!toCover) return pBrowser.close();
      const jsCoverage = await page.evaluate(() => window.__coverage__);
      writeCoverage(jsCoverage, path.join(nycReport, `./separate/${Date.now()}-coverage.json`));
      return pBrowser.close();
    }
  };
  if (toCover) {
    page.goto = async (url, options) => {
      const jsCoverage = await page.evaluate(() => window.__coverage__ || {});
      writeCoverage(jsCoverage, path.join(nycReport, `./separate/${Date.now()}-coverage.json`));
      const ret = page.mainFrame().goto(url, options);
      return ret;
    };
  }
  global.page = page;

  return true;
};

const mochaOptions = {
  timeout: 10000
};

const useJunitReporter = process.argv.indexOf('-j') > 0 || process.argv.indexOf('--junit') > 0;
const junitXmlFile = path.join(__dirname, `../../test-results/${process.argv[2].split(path.sep).pop()}/results.xml`);

if (useJunitReporter) {
  mochaOptions.reporter = 'mocha-junit-reporter';
  mochaOptions.reporterOptions = {
    mochaFile: junitXmlFile
  };
}

const mocha = new Mocha(mochaOptions);

// check if run only unit test
const runUnitTests = process.argv.indexOf('-u') > 0 || process.argv.indexOf('--unit') > 0;

// check if run only browser tests
const runBrowserTests = process.argv.indexOf('-b') > 0 || process.argv.indexOf('--browser') > 0;

// Relative to base requiring
// global.requireBase = (pt) => require(path.join(dir, pt));

(async function() {
  try {
    let ser = false;

    if (runBrowserTests || !runUnitTests) {
      const dir = process.argv[2];
      const pubPath = await testLoader(dir, mocha, { runUnitTests, runBrowserTests });
      let serverFile;
      if (pubPath) serverFile = path.join(pubPath, './server.js');
      if (pubPath && fs.existsSync(serverFile)) {
        ser = require(serverFile)(port);
      } else if (pubPath) {
        ser = listen(port, pubPath);
      }

      await loadBrowser();
    }

    mocha.run((failures) => {
      // close server if open
      if (ser) ser.close();

      if (failures) {
        process.stdout.write(`---------- ${failures} FAILURES. ----------\n`);
        process.exitCode = 1;  // exit with non-zero status if there were failures
      }

      // close browser
      if (global.browser) browser.close();

      // Get and fix code coverage
      if (toCover) {
        writeCoverage(global.__coverage__, path.join(nycReport, `./${Date.now()}-unit-coverage.json`));
        fixCoverage();
      }
    });
  } catch(e) {
    process.exitCode = 1;
    throw e;
  }
})();

// write coverage
function writeCoverage(coverage, file) {
  mkdirp.sync(path.dirname(file), (err) => {
    if (err) throw err;
  });

  fs.writeFileSync(file, JSON.stringify(coverage || {}), err => {
    if(err) throw err;
  });
}

// Filter out clutter, map to real files
async function fixCoverage() {
  const fileName = `${Date.now()}-browser-coverage.json`;
  if (fs.existsSync(`${nycReport}/separate`)) {
    await exec(`nyc merge ${nycReport}/separate ${nycReport}/${fileName}`);
    await exec(`rm -rf ${nycReport}/separate`);
  }
}