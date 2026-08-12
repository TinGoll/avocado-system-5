import { CalculatorOutlined } from '@ant-design/icons';
import { App, Button, Popconfirm, Tooltip } from 'antd';
import type { FC } from 'react';

import {
  useOrderStore,
  useRecalculateOrderPricesMutation,
} from '@entities/order';

type Props = {
  orderID?: string;
};

export const RecalculateOrderPricesButton: FC<Props> = ({ orderID }) => {
  const { message } = App.useApp();
  const setCurrentOrder = useOrderStore((state) => state.setCurrentOrder);
  const currentOrderID = useOrderStore((state) => state.currentOrder?.id);
  const { trigger, isMutating } = useRecalculateOrderPricesMutation(orderID);
  const isDisabled = !orderID || currentOrderID !== orderID;

  const recalculate = async () => {
    try {
      const updatedOrder = await trigger();
      setCurrentOrder(updatedOrder);
      message.success('Цены пересчитаны');
    } catch {
      message.error('Не удалось пересчитать цены');
    }
  };

  return (
    <Popconfirm
      title="Пересчитать сохранённые цены?"
      description="Текущие суммы позиций и заказа будут заменены расчётом по актуальным условиям."
      okText="Пересчитать"
      cancelText="Отмена"
      disabled={isDisabled}
      onConfirm={() => void recalculate()}
    >
      <Tooltip title="Пересчитать цены">
        <Button
          aria-label="Пересчитать цены"
          disabled={isDisabled}
          icon={<CalculatorOutlined />}
          loading={isMutating}
          size="small"
          type="text"
        >
          Пересчитать
        </Button>
      </Tooltip>
    </Popconfirm>
  );
};
