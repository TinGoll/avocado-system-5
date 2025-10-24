import { App } from 'antd';

export const useCopyToClipboard = (): {
  copyToClipboard: (text: string, messageText?: string) => Promise<void>;
} => {
  const { message } = App.useApp();

  const copyToClipboard = async (
    text: string,
    messageText?: string,
  ): Promise<void> => {
    try {
      await window.navigator.clipboard.writeText(text);
      if (messageText) {
        message.info(messageText);
      }
    } catch {
      message.error('Не удалось скопировать в буфер обмена');
    }
  };

  return { copyToClipboard };
};
