import { Button, Result, Space } from 'antd';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { reportClientError } from '@shared/api';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportClientError({
      message: error.message || 'Unknown client error',
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="global-error-page">
        <Result
          status="500"
          title="Что-то пошло не так"
          subTitle="Мы уже сохранили информацию об ошибке. Попробуйте перезагрузить страницу или вернуться на главную."
          extra={
            <Space wrap>
              <Button type="primary" onClick={() => window.location.reload()}>
                Перезагрузить страницу
              </Button>
              <Button onClick={() => window.location.assign('/')}>
                Вернуться на главную
              </Button>
            </Space>
          }
        />
      </main>
    );
  }
}
