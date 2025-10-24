import { css } from '@emotion/css';
import type { FC, ReactNode } from 'react';

const cardStyle = css`
  background: #121212;
  color: #fff;
  padding: 24px;
  border-radius: 16px;
  max-width: 560px;
  min-width: 460px;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
`;

const avatarStyle = css`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #2a2a2a;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  color: #888;
`;

const nameStyle = css`
  text-align: center;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
`;

const fieldRow = css`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
`;

const labelStyle = css`
  color: #aaa;
  font-size: 14px;
`;

const valueStyle = css`
  color: #fff;
  font-size: 14px;
  font-weight: 500;
`;

export const CardFieldRow: FC<{
  label: string;
  children: ReactNode;
  className?: string;
}> = ({ label, children, className }) => (
  <div className={`${fieldRow}${className ? ` ${className}` : ''}`}>
    <span className={labelStyle}>{label}</span>
    <div className={valueStyle}>{children}</div>
  </div>
);

export const CardLayout: FC<{
  avatar?: ReactNode;
  name: ReactNode;
  fields: ReactNode;
  className?: string;
}> = ({ avatar, name, fields, className }) => (
  <div className={`${cardStyle}${className ? ` ${className}` : ''}`}>
    {avatar && <div className={avatarStyle}>{avatar}</div>}
    <div className={nameStyle}>{name}</div>
    {fields}
  </div>
);
