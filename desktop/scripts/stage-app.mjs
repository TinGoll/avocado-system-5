import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const desktopDirectory = path.resolve(scriptDirectory, '..');
const repositoryDirectory = path.resolve(desktopDirectory, '..');
const buildDirectory = path.join(desktopDirectory, 'build');

await rm(buildDirectory, { force: true, recursive: true });
await mkdir(buildDirectory, { recursive: true });
await cp(
  path.join(repositoryDirectory, 'client', 'dist'),
  path.join(buildDirectory, 'client'),
  { recursive: true },
);
await cp(
  path.join(repositoryDirectory, 'server', 'dist'),
  path.join(buildDirectory, 'server'),
  { recursive: true },
);
