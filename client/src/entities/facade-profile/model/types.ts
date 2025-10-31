export type FacadeProfileCharacteristics = {
  width: number;
  /** Глубина паза под филёнку, мм */
  grooveDepth: number;
  /** Ширина паза под филёнку, мм  */
  grooveWidth?: number;
  style?: string;
};

export type FacadeProfile = {
  id: string;
  name: string;
  characteristics: FacadeProfileCharacteristics;

  createdAt: Date;
  updatedAt: Date;
};
