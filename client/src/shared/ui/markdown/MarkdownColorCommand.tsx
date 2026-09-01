import { css, cx } from '@emotion/css';
import { commands, type ICommand } from '@uiw/react-md-editor/nohighlight';

import { formatColoredText } from './markdown-color';

const colors = [
  {
    name: 'Обычный',
    value: 'inherit',
    className: css`
      color: currentColor;
    `,
  },
  {
    name: 'Красный',
    value: '#ff4d4f',
    className: css`
      color: #ff4d4f;
    `,
  },
  {
    name: 'Оранжевый',
    value: '#fa8c16',
    className: css`
      color: #fa8c16;
    `,
  },
  {
    name: 'Зелёный',
    value: '#52c41a',
    className: css`
      color: #52c41a;
    `,
  },
  {
    name: 'Синий',
    value: '#1677ff',
    className: css`
      color: #1677ff;
    `,
  },
  {
    name: 'Фиолетовый',
    value: '#722ed1',
    className: css`
      color: #722ed1;
    `,
  },
] as const;

const colorIcon = css`
  display: inline-flex;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
  border-bottom: 2px solid currentColor;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
`;

const colorCommands: ICommand[] = colors.map(
  ({ name, value, className }): ICommand => ({
    name: `text-color-${value}`,
    keyCommand: `text-color-${value}`,
    buttonProps: {
      'aria-label': name,
      title: name,
    },
    icon: <span className={cx(colorIcon, className)}>A</span>,
    execute: (state, api) => {
      api.replaceSelection(formatColoredText(state.selectedText, value));
    },
  }),
);

export const markdownColorCommand = commands.group(colorCommands, {
  name: 'text-color',
  groupName: 'text-color',
  buttonProps: {
    'aria-label': 'Цвет текста',
    title: 'Цвет текста',
  },
  icon: <span className={colorIcon}>A</span>,
});
