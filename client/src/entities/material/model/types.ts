export const MATERIAL_TYPE = {
  SOFTWOOD: 'softwood',
  HARDWOOD: 'hardwood',
  MDF: 'mdf',
} as const;

export type MaterialType = (typeof MATERIAL_TYPE)[keyof typeof MATERIAL_TYPE];

export type Material = {
  id: string;
  name: string;
  type: MaterialType;

  createdAt: Date;
  updatedAt: Date;
};
