import { contextBridge } from 'electron';

const API_PORT_ARGUMENT = '--avocado-api-port=';
const apiPort = Number(
  process.argv
    .find((argument) => argument.startsWith(API_PORT_ARGUMENT))
    ?.slice(API_PORT_ARGUMENT.length),
);

if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65_535) {
  throw new Error('The local API port was not provided to the renderer.');
}

contextBridge.exposeInMainWorld('avocadoDesktop', {
  apiBaseUrl: `http://127.0.0.1:${apiPort}`,
});
