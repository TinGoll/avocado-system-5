import { QuestionCircleOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';
import { Tooltip } from 'antd';
import type { ReactNode, FC } from 'react';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  padding-bottom: 6px;
`;

const Required = styled.span`
  margin-inline-end: 4px;
  color: #ff7875;
  font-size: 14px;
  font-family: SimSun, sans-serif;
  line-height: 1;
`;

const Title = styled.span`
  margin: 0;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 22px;
  color: var(--color-text-description);
`;

const TooltipIcon = styled(QuestionCircleOutlined)`
  color: #ffffff8b;
  cursor: help;
  :hover {
    color: #ff7875;
  }
`;

export type GridTitleProps = {
  children?: ReactNode;
  required?: boolean;
  tooltip?: string;
};

export const GridTitle: FC<GridTitleProps> = ({
  children,
  required,
  tooltip,
}) => {
  return (
    <Wrapper>
      <Title className="grid-title">
        {required && <Required className="grid-title-required">*</Required>}
        {children}
      </Title>
      {tooltip && (
        <Tooltip title={tooltip}>
          <TooltipIcon />
        </Tooltip>
      )}
    </Wrapper>
  );
};
