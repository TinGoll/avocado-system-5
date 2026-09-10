import {
  CloseCircleOutlined,
  PlayCircleOutlined,
  RedoOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/css';
import { App, Button, Input, Modal, Space } from 'antd';
import type { AxiosError } from 'axios';
import { type FC, useState } from 'react';
import { useSWRConfig } from 'swr';

import { ORDER_STATUS, type OrderStatus } from '@entities/order';
import { orderManagementKeys, updateManagement } from '@shared/api';

import { useOrderProduction } from '../api/useOrderProduction';

const styles = {
  actions: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
};

type Props = {
  groupId: number;
  status: OrderStatus;
  managementVersion: number;
};

export const OrderLifecycleActions: FC<Props> = ({
  groupId,
  status,
  managementVersion,
}) => {
  const { message } = App.useApp();
  const { mutate } = useSWRConfig();
  const production = useOrderProduction(groupId);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const revalidate = () =>
    Promise.all([
      mutate(orderManagementKeys.group(groupId)),
      mutate(orderManagementKeys.groupView(groupId)),
      mutate(orderManagementKeys.production(groupId)),
      mutate(orderManagementKeys.history(groupId)),
    ]);

  const applyStatus = async (nextStatus: OrderStatus, nextReason?: string) => {
    setIsSaving(true);
    try {
      const incompleteClose =
        nextStatus === ORDER_STATUS.COMPLETED &&
        !production.data?.productionComplete;
      await updateManagement('group', groupId, {
        expectedVersion: managementVersion,
        status: nextStatus,
        ...(nextReason ? { reason: nextReason } : {}),
        ...(incompleteClose ? { confirmIncompleteProduction: true } : {}),
      });
      await revalidate();
      setPendingStatus(null);
      setReason('');
      message.success('Состояние заказа обновлено');
    } catch (caught) {
      if ((caught as AxiosError).response?.status === 409) {
        await revalidate();
        message.warning('Заказ уже изменён. Показана актуальная версия.');
      } else {
        message.error('Не удалось изменить состояние заказа');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const requestStatus = (nextStatus: OrderStatus) => {
    const needsReason =
      status === ORDER_STATUS.COMPLETED ||
      status === ORDER_STATUS.CANCELLED ||
      (nextStatus === ORDER_STATUS.COMPLETED &&
        !production.data?.productionComplete);
    if (needsReason) setPendingStatus(nextStatus);
    else void applyStatus(nextStatus);
  };

  return (
    <>
      <div className={styles.actions}>
        {status === ORDER_STATUS.DRAFT && (
          <Button
            icon={<PlayCircleOutlined />}
            loading={isSaving}
            size='small'
            onClick={() => requestStatus(ORDER_STATUS.IN_PRODUCTION)}
          >
            Запустить заказ
          </Button>
        )}
        {status === ORDER_STATUS.IN_PRODUCTION && (
          <>
            <Button
              danger
              icon={<StopOutlined />}
              loading={isSaving}
              size='small'
              onClick={() => requestStatus(ORDER_STATUS.CANCELLED)}
            >
              Отменить заказ
            </Button>
            <Button
              type="primary"

              size='small'
              icon={<CloseCircleOutlined />}
              loading={isSaving}
              onClick={() => requestStatus(ORDER_STATUS.COMPLETED)}
            >
              Закрыть заказ
            </Button>
          </>
        )}
        {(status === ORDER_STATUS.COMPLETED ||
          status === ORDER_STATUS.CANCELLED) && (
          <Button
            icon={<RedoOutlined />}
            size='small'
            onClick={() => requestStatus(ORDER_STATUS.IN_PRODUCTION)}
          >
            Возобновить заказ
          </Button>
        )}
      </div>
      <Modal
        title={
          pendingStatus === ORDER_STATUS.COMPLETED
            ? 'Закрыть заказ без полного учёта производства'
            : 'Причина возобновления'
        }
        open={pendingStatus !== null}
        okButtonProps={{ disabled: !reason.trim(), loading: isSaving }}
        okText="Подтвердить"
        cancelText="Отмена"
        onCancel={() => {
          setPendingStatus(null);
          setReason('');
        }}
        onOk={() => {
          if (pendingStatus && reason.trim())
            void applyStatus(pendingStatus, reason.trim());
        }}
      >
        <Space
          direction="vertical"
          className={css`
            width: 100%;
          `}
        >
          <span>Укажите причину:</span>
          <Input.TextArea
            autoFocus
            maxLength={1000}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Space>
      </Modal>
    </>
  );
};
