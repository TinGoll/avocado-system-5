export type FacadeProfileCharacteristics = {
  style?: string;
};

export type FacadePanel = {
  id: string;
  name: string;
  characteristics: FacadeProfileCharacteristics;

  createdAt: Date;
  updatedAt: Date;
};
