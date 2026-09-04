import { Progress, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { resolveApiBaseUrl } from '@shared/lib/swr';

const HEALTH_URL = `${resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)}/health`;
const REQUEST_TIMEOUT_MS = 3_000;
const RETRY_DELAY_MS = 1_000;
const SLOW_START_MS = 10_000;
const PROGRESS_DURATION_MS = 15_000;
const TRANSITION_DURATION_MS = 2_000;

type Props = {
  onConnected: () => void;
  onTransitionComplete: () => void;
};

export const ServerConnectionScreen = ({
  onConnected,
  onTransitionComplete,
}: Props) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    const progressTimer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 250);

    return () => window.clearInterval(progressTimer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    const connect = async () => {
      try {
        const response = await fetch(HEALTH_URL, {
          cache: 'no-store',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (response.ok && !cancelled) {
          setIsConnected(true);
          onConnected();
          return;
        }
      } catch {
        // The server is still starting. Retry below.
      }

      if (!cancelled) {
        retryTimer = window.setTimeout(connect, RETRY_DELAY_MS);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [onConnected]);

  useEffect(() => {
    if (!isConnected) return;

    const transitionTimer = window.setTimeout(
      onTransitionComplete,
      TRANSITION_DURATION_MS,
    );

    return () => window.clearTimeout(transitionTimer);
  }, [isConnected, onTransitionComplete]);

  const progress = isConnected
    ? 100
    : Math.min(90, (elapsedMs / PROGRESS_DURATION_MS) * 90);
  const isSlowStart = elapsedMs >= SLOW_START_MS;

  return (
    <main
      className={`server-connection-screen${isConnected ? ' server-connection-screen--connected' : ''}`}
    >
      <section className="server-connection-card">
        <Typography.Title level={2}>Подключение к серверу</Typography.Title>
        <Typography.Text type="secondary">
          {isConnected
            ? 'Сервер готов. Запускаем приложение…'
            : isSlowStart
              ? 'Запуск занимает больше времени, чем обычно. Продолжаем ждать…'
              : 'Подождите, пока сервер будет готов к работе.'}
        </Typography.Text>
        <Progress percent={progress} showInfo={false} status="active" />
      </section>
    </main>
  );
};
