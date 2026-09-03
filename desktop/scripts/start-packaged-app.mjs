import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const desktopDirectory = path.resolve(scriptDirectory, '..');
const packageDirectory = path.join(
  desktopDirectory,
  'out',
  `Avocado-${process.platform}-${process.arch}`,
);
const executableByPlatform = {
  darwin: path.join(
    packageDirectory,
    'Avocado.app',
    'Contents',
    'MacOS',
    'Avocado',
  ),
  linux: path.join(packageDirectory, 'Avocado'),
  win32: path.join(packageDirectory, 'Avocado.exe'),
};
const executable = executableByPlatform[process.platform];

if (!executable) {
  throw new Error(`Unsupported desktop platform: ${process.platform}`);
}

const application = spawn(executable, [], {
  detached: true,
  stdio: 'ignore',
});

application.unref();
