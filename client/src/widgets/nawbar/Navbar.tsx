import { PlusOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import type { FC } from 'react';

import { Logo } from '@entities/logo';
import { CreateOrderButton } from '@features/create-orders';

const styles = {
  navbar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  actions: css`
    padding: 8px;
  `,
};

export const Navbar: FC = () => {
  return (
    <div className={styles.navbar}>
      <Logo />
      <div className={styles.actions}>
        <CreateOrderButton
          icon={<PlusOutlined />}
          variant="solid"
          color="green"
        >
          Создать заказ
        </CreateOrderButton>
      </div>
    </div>
  );
};
