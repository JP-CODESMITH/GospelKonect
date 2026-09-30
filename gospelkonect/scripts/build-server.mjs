// Bundles the API into the single self-contained file Composer requires.
//
// Composer copies ONE file per service and never ships node_modules, so
// `dist/main.js` (tsc output: one file per source file, bare imports left
// behind) cannot be the entry — it dies at `Cannot find module
// './app.module.js'` on boot.
//
// Two things decide the bundler choice:
//
//   1. NestJS needs `emitDecoratorMetadata` for constructor injection, which
//      Bun's (and esbuild's) own TS transpiler does not implement. SWC does,
//      so SWC transforms every .ts file and Bun bundles the result.
//   2. Native addons cannot be inlined. `argon2` stays external: it resolves
//      from the app's own node_modules locally, and swapping it for a
//      pure-ESM password hash is a separate decision.

import { transform } from '@swc/core';

/** TS in, decorator-metadata-bearing JS out. */
const swcTypeScript = {
  name: 'swc-typescript',
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const { code } = await transform(source, {
        filename: args.path,
        // sourceMaps: 'inline' would double every file's size in one bundle.
        sourceMaps: false,
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          // legacyDecorator: legacy (stage-1) decorators, which Nest uses;
          // decoratorMetadata: the design:paramtypes reflection Nest's
          // constructor injection reads.
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2022',
          keepClassNames: true,
        },
        module: { type: 'es6' },
      });
      return { contents: code, loader: 'js' };
    });
  },
};

const result = await Bun.build({
  entrypoints: ['src/main.ts'],
  outdir: 'dist',
  // One file, named deterministically: this is what src/service.ts's build
  // adapter points at.
  naming: { entry: 'server.mjs' },
  target: 'bun',
  format: 'esm',
  sourcemap: 'none',
  // Bundle dependencies too (node_modules would otherwise be needed at boot).
  // Only what cannot be inlined stays out:
  //   - argon2 is a native addon;
  //   - @nestjs/microservices and @nestjs/websockets are optional Nest peers
  //     we do not use; Nest loads them through optionalRequire(), so leaving
  //     the import for the runtime to fail keeps that path intact.
  external: [
    'argon2',
    '@nestjs/microservices',
    '@nestjs/microservices/*',
    '@nestjs/websockets',
    '@nestjs/websockets/*',
  ],
  plugins: [swcTypeScript],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const outputs = result.outputs.map((output) => output.path);
console.log(`bundled ${outputs.length} file(s): ${outputs.join(', ')}`);
