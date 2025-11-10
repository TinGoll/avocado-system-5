import { css } from '@emotion/css';
import type { FC } from 'react';
import { Outlet } from 'react-router';

import { Navbar } from '@widgets/nawbar';

const styles = css`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-color: var(--app-body-background-color);

  & .app-header {
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid var(--app-devider-color);
    background-color: var(--app-surface-1-background-color);
  }

  & .app-footer {
    position: sticky;
    bottom: 0;
    z-index: 10;
    border-top: 1px solid var(--app-devider-color);
  }

  & .app-main {
    position: relative;
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;

    & .app-sidebar {
      width: 200px;
      border-right: 1px solid var(--app-devider-color);
      overflow: auto;
    }

    & .app-content {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }
  }
`;

const BasePage: FC = () => {
  return (
    <div className={styles}>
      <header className="app-header">
        <Navbar />
      </header>
      <main className="app-main">
        <div className="app-sidebar">
          sidebar
          <br />
          dfd
          <br />
          dsfdsf
          <br />
          dfdf
          <br />
          ...
          <br />
          scroll me!
        </div>
        <div className="app-content">
          <Outlet />
        </div>
      </main>
      <footer className="app-footer">footer</footer>
    </div>
  );
};

export default BasePage;
