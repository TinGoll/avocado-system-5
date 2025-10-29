export const COLOR_TYPE = {
  STAIN: 'stain',
  ENAMEL: 'enamel',
} as const;

export type ColorType = (typeof COLOR_TYPE)[keyof typeof COLOR_TYPE];

export type Color = {
  id: string;
  name: string;
  type: ColorType;

  createdAt: Date;
  updatedAt: Date;
};
