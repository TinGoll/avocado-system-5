export const formatColoredText = (text: string, color: string): string => {
  const [, leadingWhitespace, content, trailingWhitespace] = text.match(
    /^(\s*)([\s\S]*?)(\s*)$/,
  ) ?? ['', '', text, ''];
  const coloredContent = content || 'цветной текст';

  return `${leadingWhitespace}_${coloredContent}_<!--rehype:style=color: ${color}; font-style: normal;-->${trailingWhitespace}`;
};

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
};

const colorCommentPattern =
  /^<!--rehype:style=color: (?:inherit|#[\da-f]{6}); font-style: normal;-->$/i;

export const removeMarkdownColorComments =
  () =>
  (tree: MarkdownNode): void => {
    if (!tree.children) return;

    tree.children = tree.children.filter(
      (node) =>
        node.type !== 'raw' || !colorCommentPattern.test(node.value ?? ''),
    );
    tree.children.forEach((node) => removeMarkdownColorComments()(node));
  };
