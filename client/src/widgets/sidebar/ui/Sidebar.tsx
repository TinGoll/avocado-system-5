import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/css';
import { Button, Menu } from 'antd';
import { type FC, useState } from 'react';
import { Link, useLocation } from 'react-router';

const styles = {
  sidebar: css`
    width: 200px;
    height: 100%;
    display: flex;
    flex-direction: column;
    transition: width 0.2s;
  `,
  collapsed: css`
    width: 80px;
  `,
  menu: css`
    flex: 1;
    overflow-y: auto;
    border-inline-end: 0;
    background-color: transparent;
  `,
  toggle: css`
    width: 100%;
    height: 48px;
    flex: 0 0 auto;
    border-radius: 0;
  `,
};

export const Sidebar: FC = () => {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <Menu
        className={styles.menu}
        inlineCollapsed={collapsed}
        mode="inline"
        selectedKeys={pathname === '/' ? ['/'] : []}
        items={[
          {
            key: '/',
            icon: <ShoppingCartOutlined />,
            label: <Link to="/">Заказы</Link>,
          },
        ]}
      />
      <Button
        aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        block
        className={styles.toggle}
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        type="text"
        onClick={() => setCollapsed((value) => !value)}
      >
        {collapsed ? null : 'Свернуть'}
      </Button>
    </div>
  );
};
