import styled from '@emotion/styled';
import type { FC } from 'react';

const Row = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  /* flex-wrap: wrap; */
  gap: 4px;
  margin-bottom: 8px;
  min-width: 0;
`;
const Label = styled.div`
  flex: 0 0 140px;
  padding: 4px 8px;
  background-color: var(--app-surface-1-background-color);
  border-radius: 4px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  user-select: none;
  display: flex;
  justify-content: space-between;
  min-width: 0;
`;
const Value = styled.div`
  flex: 1 1 auto;
  padding: 4px 8px;
  font-weight: 500;
  background-color: var(--app-surface-1-background-color);
  border-radius: 4px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  user-select: none;
  min-width: 0;

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
