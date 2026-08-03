import type { App } from 'antd';

let messageApi: ReturnType<typeof App.useApp>['message'] | null = null;

export const setMessageApi = (
  api: ReturnType<typeof App.useApp>['message'],
) => {
  messageApi = api;
};

export const showErrorMessage = (text: string) => {
  if (messageApi) {
    messageApi.error({ content: text });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(text);
};
