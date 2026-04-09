import { css } from '@emotion/css';
import { Avatar } from 'antd';
import type { FC } from 'react';
import { Link } from 'react-router';

import image from '@shared/assets/icon/logo.png';

const styles = {
  logo: css`
    display: inline-flex;
    margin-left: 8px;
    align-items: center;
    justify-content: center;
  `,
  link: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 100%;
  `,
};

export const Logo: FC = () => {
  return (
    <div className={styles.logo}>
      <Link to="/" className={styles.link}>
        <Avatar
          size="small"
          src={<img draggable={false} src={image} alt="avatar" />}
        />
        <span>AVOCADO</span>
      </Link>
    </div>
  );
};
