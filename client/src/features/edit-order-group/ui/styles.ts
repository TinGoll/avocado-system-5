import { css } from '@emotion/css';

export const styles = {
  editable: css`
    &.editable-container {
      &::before {
        border: none;
      }
    }
  `,
  actions: css`
    flex: 0;
    display: flex;
    align-items: center;
    gap: 4px;
  `,
  input: css`
    color: inherit;
    font-size: inherit;
    font-weight: inherit;
    width: 100%;
  `,
  title: css`
    font-size: 14px;
  `,
};
