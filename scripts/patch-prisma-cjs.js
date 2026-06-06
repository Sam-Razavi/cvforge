#!/usr/bin/env node
// Patches the compiled Prisma client to be CJS-compatible.
// Prisma v7 generates client.ts with `import.meta.url` which Node.js 22
// routes through the ESM loader even in CJS context, causing "exports is not
// defined in ES module scope".  In CJS, __dirname is already available, so
// the import.meta.url line is redundant and safe to replace.
const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, '..', 'dist', 'generated', 'prisma', 'client.js');

if (!fs.existsSync(clientPath)) {
  console.error('patch-prisma-cjs: client.js not found at', clientPath);
  process.exit(1);
}

let src = fs.readFileSync(clientPath, 'utf8');

const before = `globalThis['__dirname'] = path.dirname((0, node_url_1.fileURLToPath)(import.meta.url));`;
const after  = `globalThis['__dirname'] = globalThis['__dirname'] || __dirname;`;

if (!src.includes(before)) {
  console.log('patch-prisma-cjs: nothing to patch (already patched or pattern changed)');
  process.exit(0);
}

src = src.replace(before, after);
fs.writeFileSync(clientPath, src, 'utf8');
console.log('patch-prisma-cjs: patched dist/generated/prisma/client.js');
