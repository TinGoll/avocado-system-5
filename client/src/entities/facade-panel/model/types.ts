export type FacadePanelCharacteristics = {
  style?: string;
};

export type FacadePanel = {
  id: string;
  name: string;
  characteristics: FacadePanelCharacteristics;

  createdAt: Date;
  updatedAt: Date;
};
