import styled from '@emotion/styled';
import type { FC } from 'react';

const Row = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-bottom: 8px;
  gap: 8px;
`;
const Label = styled.div`
  padding: 4px 8px;
  min-width: 160px;
  background-color: var(--app-surface-1-background-color);
  border-radius: 4px;
  user-select: none;

  display: flex;
  justify-content: space-between;
`;
const Value = styled.div`
  padding: 4px 8px;
  font-weight: 500;
  min-width: 260px;
  background-color: var(--app-surface-1-background-color);
  border-radius: 4px;
  user-select: none;

  cursor: pointer;
  transition: box-shadow 0.3s ease;
  &:hover {
    box-shadow: 0 0 0 2px var(--app-devider-color);
  }
`;

type Props = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

type Сomposition = {
  Label: typeof Label;
  Value: typeof Value;
};

export const Field: FC<Props> & Сomposition = (props) => {
  return <Row {...props} />;
};

Field.Label = Label;
Field.Value = Value;
