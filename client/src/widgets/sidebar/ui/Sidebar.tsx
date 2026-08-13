import {
  AppstoreOutlined,
  BgColorsOutlined,
  BorderOutlined,
  BuildOutlined,
  DatabaseOutlined,
  FormatPainterOutlined,
  HighlightOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PercentageOutlined,
  ProfileOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
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
    height: 32px;
    flex: 0 0 auto;
    border-radius: 0;
    justify-content: flex-start;
  `,
};

export const Sidebar: FC = () => {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <Menu
        className={styles.menu}
        defaultOpenKeys={['catalogs']}
        inlineCollapsed={collapsed}
        mode="inline"
        selectedKeys={[pathname]}
        items={[
          {
            key: '/',
            icon: <ShoppingCartOutlined />,
            label: <Link to="/">Заказы</Link>,
          },
          {
            key: '/price-modifiers',
            icon: <PercentageOutlined />,
            label: <Link to="/price-modifiers">Модификаторы цен</Link>,
          },
          {
            key: 'catalogs',
            icon: <DatabaseOutlined />,
            label: 'Справочники',
            children: [
              {
                key: '/customers',
                icon: <TeamOutlined />,
                label: <Link to="/customers">Клиенты</Link>,
              },
              {
                key: '/products',
                icon: <AppstoreOutlined />,
                label: <Link to="/products">Номенклатура</Link>,
              },
              {
                key: '/materials',
                icon: <BuildOutlined />,
                label: <Link to="/materials">Материалы</Link>,
              },
              {
                key: '/colors',
                icon: <BgColorsOutlined />,
                label: <Link to="/colors">Красители</Link>,
              },
              {
                key: '/facade-panels',
                icon: <BorderOutlined />,
                label: <Link to="/facade-panels">Филёнки</Link>,
              },
              {
                key: '/facade-profiles',
                icon: <ProfileOutlined />,
                label: <Link to="/facade-profiles">Фасадные профили</Link>,
              },
              {
                key: '/patinas',
                icon: <HighlightOutlined />,
                label: <Link to="/patinas">Патины</Link>,
              },
              {
                key: '/varnishes',
                icon: <FormatPainterOutlined />,
                label: <Link to="/varnishes">Лаки</Link>,
              },
              {
                key: '/production-operations',
                icon: <SettingOutlined />,
                label: <Link to="/production-operations">Работы</Link>,
              },
            ],
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
        variant="filled"
        size="small"
        color="lime"
      >
        {collapsed ? null : 'Свернуть'}
      </Button>
    </div>
  );
};
