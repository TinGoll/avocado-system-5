import styled from '@emotion/styled';

export const EditableFactoryWrapper = styled.div`
  position: relative;
  display: inline-flex;
  box-sizing: border-box;
  max-width: 100%;
  gap: 8px;

  &.editable-block {
    display: flex;
    & .editable-control {
      flex: 1;
    }
  }

  & .editable-inner {
    display: flex;
    gap: 4px;
    align-items: stretch;
    box-sizing: border-box;
    width: 100%;
    & .editable-control-wrapper {
      flex: 1 1 0;
      min-width: 0;
    }
    & .editable-buttons {
      flex-shrink: 0;
    }
  }

  & .editable-control {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  &:hover {
    cursor: pointer;
    & .editable-edit-icon {
      opacity: 1;
    }
  }

  &:hover::before {
    opacity: 1;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -6px;
    right: 0;
    bottom: 0;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &.editable-editing,
  &.editable-disabled {
    cursor: default;
    &::before {
      opacity: 0;
    }
  }

  & .editable-content {
    flex: 1;
  }

  & .editable-edit-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: #0000000f;
    border-radius: 0 6px 6px 0;
    min-width: 24px;
  }

  & .editable-loading-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
  }
`;
