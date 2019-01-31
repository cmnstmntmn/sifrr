const version = require('./package.json').version;
const babel = require('rollup-plugin-babel');
const eslint = require('rollup-plugin-eslint').eslint;
const terser = require('rollup-plugin-terser').terser;
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const cleanup = require('rollup-plugin-cleanup');

module.exports = function getRollupConfig(name, isBrowser = true) {
  let fileName = name.toLowerCase();
  let banner = `/*! ${name} v${version} - sifrr project | MIT licensed | https://github.com/sifrr/sifrr */`;
  let footer = '/*! (c) @aadityataparia */';
  let ret = [];
  const external = [
    'path',
    'fs',
    'graphql',
    'sequelize',
    'graphql-sequelize',
    'graphql-tools',
    '@sifrr/dom',
    '@sifrr/fetch',
    'puppeteer',
    'events'
  ];
  const globals = {
    '@sifrr/dom': 'Sifrr.Dom',
    '@sifrr/fetch': 'Sifrr.Fetch'
  };
  if (isBrowser) {
    ret = [
      {
        input: `src/${fileName}.js`,
        output: {
          file: `dist/${fileName}.js`,
          format: 'umd',
          name: name,
          banner: banner,
          footer: footer,
          sourcemap: true,
          preferConst: true,
          globals: globals
        },
        external: external,
        plugins: [
          resolve({
            browser: true
          }),
          commonjs(),
          eslint(),
          babel({
            exclude: 'node_modules/**',
          }),
          cleanup()
        ]
      },
      {
        input: `src/${fileName}.js`,
        output: {
          file: `dist/${fileName}.min.js`,
          format: 'umd',
          name: name,
          banner: banner,
          footer: footer,
          sourcemap: true,
          preferConst: true,
          globals: globals
        },
        external: external,
        plugins: [
          resolve({
            browser: true
          }),
          commonjs(),
          babel({
            exclude: 'node_modules/**',
          }),
          cleanup(),
          terser({
            output: {
              comments: 'all'
            }
          })
        ]
      }
    ];
  }
  ret.push({
    input: `src/${fileName}.js`,
    output: {
      file: `dist/${fileName}.module.js`,
      format: 'es',
      banner: banner,
      footer: footer,
      preferConst: true,
      globals: globals
    },
    external: external,
    plugins: [
      resolve(),
      commonjs(),
      babel({
        exclude: 'node_modules/**',
      })
    ]
  });

  return ret;
};
