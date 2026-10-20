// Compatibility fix for React 19 / Next.js 16.2 client-side provider mounts.
// Upstream: https://github.com/pacocoursey/next-themes/pull/386
// Keep the first-paint script in SSR HTML; never recreate it on the client.
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');

const dist = path.dirname(require.resolve('next-themes'));
const { version } = JSON.parse(fs.readFileSync(path.join(dist, '../package.json'), 'utf8'));
if (version !== '0.4.6') {
  throw new Error(`Review the next-themes compatibility patch before using version ${version}.`);
}

const guard = 'if(typeof window!=="undefined")return null;';
let changed = 0;
for (const name of ['index.js', 'index.mjs']) {
  const filename = path.join(dist, name);
  const source = fs.readFileSync(filename, 'utf8');
  const matches = source.match(/return [\w$.]+\.createElement\("script",/g) || [];
  if (matches.length !== 1) {
    throw new Error(`Unexpected next-themes script renderer in ${name}; review the compatibility patch.`);
  }
  const render = matches[0];
  if (source.includes(guard + render)) continue;
  const temporary = filename + '.react-19.tmp';
  fs.writeFileSync(temporary, source.replace(render, guard + render));
  fs.renameSync(temporary, filename);
  changed++;
}
console.log(`next-themes React 19 compatibility: ${changed ? `patched ${changed} bundles` : 'already applied'}.`);
