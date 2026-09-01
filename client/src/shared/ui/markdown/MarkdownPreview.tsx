import { css } from '@emotion/css';
import MDEditor from '@uiw/react-md-editor/nohighlight';
import type { FC } from 'react';

import '@uiw/react-markdown-preview/markdown.css';

const preview = css`
  &.wmde-markdown {
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    font-weight: 400;
    line-height: inherit;
    background: transparent;
  }

  &.wmde-markdown > :first-child {
    margin-top: 0;
  }

  &.wmde-markdown > :last-child {
    margin-bottom: 0;
  }
`;

type Props = {
  value?: string;
  emptyText?: string;
  className?: string;
};

export const MarkdownPreview: FC<Props> = ({
  value,
  emptyText = '—',
  className,
}) => {
  if (!value?.trim()) return <>{emptyText}</>;

  return (
    <div className={className} data-color-mode="dark">
      <MDEditor.Markdown className={preview} source={value} />
    </div>
  );
};
