const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const json = require('@rollup/plugin-json');
const terser = require('@rollup/plugin-terser').default;
const dts = require('rollup-plugin-dts').default;
const os = require('os');

// Os drivers NUNCA podem ser empacotados dentro do dist.
// Eles são carregados em runtime, de forma tardia, pelo host (main process / CLI).
const driverExternal = ['pg', 'mysql2', 'tedious', 'oracledb', 'ibm_db'];

const nodeExternal = [
  'node:crypto', 'node:fs/promises', 'node:os', 'node:path', 'node:module',
  'crypto', 'fs', 'os', 'path', 'stream', 'events', 'util', 'buffer', 'net', 'tls'
];

const external = [...driverExternal, ...nodeExternal];

const jsPlugins = [
  nodeResolve({ extensions: ['.js', '.ts', '.json'] }),
  json(),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false
  }),
  terser({
    maxWorkers: Math.max(1, os.availableParallelism())
  })
];

module.exports = [
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/cjs/index.js', format: 'cjs', sourcemap: true, exports: 'named' },
      { file: 'dist/esm/index.js', format: 'esm', sourcemap: true, exports: 'named' }
    ],
    plugins: jsPlugins,
    external
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()],
    external
  }
];
