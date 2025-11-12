import { css } from '@emotion/css';
import { type FC } from 'react';
import { Link } from 'react-router';

import svgLogo from '@shared/assets/icon/logo.png';

const styles = css`
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 16px;
  a {
    display: flex;
    align-items: center;
    height: 100%;
    img {
      width: 26px;
      height: auto;
    }
  }
`;

export const Logo: FC = () => {
  return (
    <div className={styles}>
      <Link to="/">
        <img src={svgLogo} alt="MYug Logo" />
      </Link>
    </div>
  );
};
