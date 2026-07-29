# Understanding Webpack Bundling and Workspace Resolution

We established why NestJS was failing to resolve workspace imports in watch mode: Node 22 runs raw TS files as ES Modules, which require explicit file extensions. By configuring Webpack with a custom configuration that inlines `@eventify/shared-types`, we resolved the crash.

## Evidence
- The compilation error `Cannot find module .../enums/role.enum` was thrown by Node's ESM resolver when reading raw typescript files.
- We enabled Webpack and configured `webpack-node-externals` with an `allowlist` for `@eventify/shared-types`, which inlined it inside `dist/main.js` and successfully resolved the imports at build time.
