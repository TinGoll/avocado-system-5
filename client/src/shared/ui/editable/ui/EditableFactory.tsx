import { EditOutlined, LoadingOutlined } from '@ant-design/icons';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import React from 'react';

import type { ControlProps, EditableProps } from '../editable.types';
import type { EditableHookReturn } from '../hooks/useEditable';

import { EditableFactoryWrapper } from './EditableFactoryWrapper';

interface Props<T> extends EditableProps<T> {
  editable: EditableHookReturn<T>;
  renderButton?: () => ReactNode;
  renderChildren?: () => ReactNode;
}

export const EditableFactory = <T,>(props: Props<T>): ReactNode => {
  const {
    control,
    editable,
    className,
    css,
    disabled,
    block,
    editIcon,
    loading,
    renderButton,
    renderChildren,
  } = props;

  const { controlProps, editing, controlRef, containerRef, startEdit } =
    editable;

  const showEditIcon = !editing && !disabled;
  const showLoading = loading;

  const combinedClassName = [
    'editable-container',
    editing && 'editable-editing',
    disabled && 'editable-disabled',
    block && 'editable-block',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = (): void => {
    startEdit?.();
  };

  const baseControlProps = {
    ...controlProps,
    ref: controlRef,
    className: [
      'editable-control',
      (typeof control !== 'function' &&
        isValidElement(control) &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (control as any).props.className) ||
        '',
    ]
      .filter(Boolean)
      .join(' '),
  };

  const renderEditableControl = (): ReactNode => {
    if (typeof control === 'function') {
      return control(baseControlProps as ControlProps<T>);
    }

    if (isValidElement(control)) {
      // eslint-disable-next-line react-x/no-clone-element
      return React.cloneElement(control as ReactElement, baseControlProps);
    }

    return null;
  };

  const buttonContent = renderButton?.();

  return (
    <EditableFactoryWrapper
      ref={containerRef}
      style={css}
      className={combinedClassName}
      onClick={handleClick}
    >
      {editing ? (
        <div className="editable-inner">
          <div className="editable-control-wrapper">
            {renderEditableControl()}
          </div>
          {buttonContent && (
            <div className="editable-buttons">{buttonContent}</div>
          )}
        </div>
      ) : (
        <>
          <div className="editable-content">{renderChildren?.()}</div>
          {!showLoading && showEditIcon && (
            <span className="editable-edit-icon">
              {editIcon ?? <EditOutlined />}
            </span>
          )}
          {showLoading && (
            <span className="editable-loading-icon">
              <LoadingOutlined height={18} width={18} />
            </span>
          )}
        </>
      )}
    </EditableFactoryWrapper>
  );
};
