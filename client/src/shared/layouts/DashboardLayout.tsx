import { css } from '@emotion/css';
import { type FC, type ReactNode } from 'react';
import { Outlet } from 'react-router';

const styles = css`
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  & .app-header {
    position: sticky;
    top: 0;
    height: var(--app-header-height);
  }

  & .app-main {
    flex: 1;
  }
`;

type Props = {
  navbar?: ReactNode;
  footer?: ReactNode;
};

export const DashboardLayout: FC<Props> = ({ navbar, footer }) => {
  return (
    <div className={styles}>
      {navbar && <header className="app-header">{navbar}</header>}
      <main className="app-main">
        <Outlet />
      </main>
      {footer && <footer className="app-footer">{footer}</footer>}
    </div>
  );
};
