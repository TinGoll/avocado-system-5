import { DeleteOutlined, WarningOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Alert, App, Button, Card, Input, Modal, Typography } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';

import { resetDatabase } from '@shared/api';

const RESET_CONFIRMATION = 'УДАЛИТЬ ВСЕ ДАННЫЕ';

const styles = {
  card: css`
    margin-top: 16px;
    border-color: var(--ant-color-error-border);
  `,
  description: css`
    display: block;
    margin-bottom: 16px;
  `,
  confirmation: css`
    display: block;
    margin: 16px 0 8px;
  `,
};

export const DatabaseResetCard: FC = () => {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const close = () => {
    if (isResetting) return;
    setOpen(false);
    setConfirmation('');
  };

  const reset = async () => {
    setIsResetting(true);
    try {
      await resetDatabase(confirmation);
      message.success('База данных полностью сброшена');
      window.location.reload();
    } catch {
      message.error('Не удалось сбросить базу данных');
      setIsResetting(false);
    }
  };

  return (
    <>
      <Card className={styles.card} title="Опасная зона">
        <Typography.Text className={styles.description} type="secondary">
          Полный сброс удалит заказы, клиентов, справочники, настройки и все
          остальные данные приложения.
        </Typography.Text>
        <Button danger icon={<DeleteOutlined />} onClick={() => setOpen(true)}>
          Полностью сбросить базу данных
        </Button>
      </Card>
      <Modal
        cancelButtonProps={{ disabled: isResetting }}
        cancelText="Отмена"
        closable={!isResetting}
        maskClosable={false}
        okButtonProps={{
          danger: true,
          disabled: confirmation !== RESET_CONFIRMATION,
          loading: isResetting,
        }}
        okText="Удалить все данные"
        open={open}
        title="Полный сброс базы данных"
        onCancel={close}
        onOk={reset}
      >
        <Alert
          showIcon
          icon={<WarningOutlined />}
          type="error"
          title="Эта операция опасна и необратима"
          description="Все данные будут удалены без возможности восстановления. Структура пустой базы будет создана заново."
        />
        <Typography.Text className={styles.confirmation}>
          Для подтверждения введите{' '}
          <Typography.Text code>{RESET_CONFIRMATION}</Typography.Text>
        </Typography.Text>
        <Input
          autoComplete="off"
          disabled={isResetting}
          placeholder={RESET_CONFIRMATION}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </Modal>
    </>
  );
};
