import MDEditor, { commands } from '@uiw/react-md-editor/nohighlight';
import type { FC } from 'react';

import '@uiw/react-md-editor/markdown-editor.css';

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
};

const editorCommands = [
  commands.bold,
  commands.italic,
  commands.strikethrough,
  commands.divider,
  commands.link,
  commands.quote,
  commands.unorderedListCommand,
  commands.orderedListCommand,
];

export const MarkdownEditor: FC<Props> = ({ value, onChange, className }) => (
  <div className={className} data-color-mode="dark">
    <MDEditor
      commands={editorCommands}
      height={200}
      preview="edit"
      value={value ?? ''}
      onChange={(nextValue) => onChange?.(nextValue ?? '')}
      visibleDragbar={false}
    />
  </div>
);
