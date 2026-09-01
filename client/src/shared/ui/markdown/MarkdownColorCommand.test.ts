import { describe, expect, it } from 'vitest';

import {
  formatColoredText,
  removeMarkdownColorComments,
} from './markdown-color';

describe('formatColoredText', () => {
  it('applies a color without changing the visual font style', () => {
    expect(formatColoredText('важно', '#ff4d4f')).toBe(
      '_важно_<!--rehype:style=color: #ff4d4f; font-style: normal;-->',
    );
  });

  it('keeps whitespace outside the formatted fragment', () => {
    expect(formatColoredText(' текст ', '#1677ff')).toBe(
      ' _текст_<!--rehype:style=color: #1677ff; font-style: normal;--> ',
    );
  });

  it('inserts a placeholder when no text is selected', () => {
    expect(formatColoredText('', 'inherit')).toBe(
      '_цветной текст_<!--rehype:style=color: inherit; font-style: normal;-->',
    );
  });
});

describe('removeMarkdownColorComments', () => {
  it('removes a generated color marker from the rendered tree', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          children: [
            { type: 'text', value: 'важно' },
            {
              type: 'raw',
              value: '<!--rehype:style=color: #fa8c16; font-style: normal;-->',
            },
          ],
        },
      ],
    };

    removeMarkdownColorComments()(tree);

    expect(tree.children[0].children).toEqual([
      { type: 'text', value: 'важно' },
    ]);
  });

  it('keeps unrelated raw content unchanged', () => {
    const tree = {
      type: 'root',
      children: [{ type: 'raw', value: '<span>текст</span>' }],
    };

    removeMarkdownColorComments()(tree);

    expect(tree.children).toEqual([
      { type: 'raw', value: '<span>текст</span>' },
    ]);
  });
});
