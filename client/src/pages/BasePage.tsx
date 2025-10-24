import { css } from '@emotion/css';
import type { FC } from 'react';
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

const BasePage: FC = () => {
  return (
    <div className={styles}>
      <header className="app-header">navbar</header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">footer</footer>
    </div>
  );
};

export default BasePage;
