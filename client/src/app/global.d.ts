declare module '*.css';
declare module '*.svg';
declare module '*.png';
declare module '*.mp3';

declare module '*.worker.ts' {
  class WebpackWorker extends Worker {
    constructor();
  }

  export default WebpackWorker;
}
