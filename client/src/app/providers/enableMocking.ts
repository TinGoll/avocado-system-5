export async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW === 'false') {
    return;
  }

  const { worker } = await import('@shared/api/mocks/browser');

  await worker.start({
    onUnhandledRequest: 'bypass',
  });
}
