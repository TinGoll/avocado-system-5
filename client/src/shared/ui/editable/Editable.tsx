import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';
import { Button } from 'antd';
import type { ReactNode } from 'react';

import type { EditableProps } from './editable.types';
import { useEditable } from './hooks/useEditable';
import { EditableFactory } from './ui/EditableFactory';

const StyledButtons = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  height: 100%;
  gap: 4px;
  & > button {
    height: 100%;
    max-height: 32px;
    min-height: 24px;
  }
`;

type Props<T> = EditableProps<T>;

export const Editable = <T,>(props: Props<T>): ReactNode => {
  const editable = useEditable<T>({
    ...props,
  });
  const { onConfirm, onCancel } = editable;

  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    <EditableFactory<T>
      {...props}
      editable={editable}
      control={props.control}
      renderButton={() => (
        <StyledButtons>
          <Button
            size="small"
            type="text"
            icon={<CheckOutlined />}
            onClick={onConfirm}
          />
          <Button
            size="small"
            type="text"
            icon={<CloseOutlined />}
            onClick={onCancel}
          />
        </StyledButtons>
      )}
      renderChildren={() => props.children}
    />
  );
};
