import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Input } from 'antd';
import type { FC } from 'react';
import { useNavigate } from 'react-router';

import { CreateOrderButton } from '@features/create-order';
import { Logo } from '@shared/ui';

const styles = {
  navbar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  actions: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
  `,
  search: css`
    width: min(360px, 35vw);
  `,
};

export const Navbar: FC = () => {
  const navigate = useNavigate();

  const search = (value: string) => {
    const query = value.trim();
    if (query.length < 2) return;

    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className={styles.navbar}>
      <Logo />
      <Input.Search
        className={styles.search}
        enterButton={<SearchOutlined />}
        placeholder="Поиск заказов"
        aria-label="Поиск заказов"
        onSearch={search}
      />
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
