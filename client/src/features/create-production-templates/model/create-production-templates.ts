export interface ProductionTemplateCharacteristics {
  width: number;
  grooveDepth: number;
  grooveWidth?: number;
  style?: string;
}

export interface CreateProductionTemplateData {
  name: string;
  characteristics: ProductionTemplateCharacteristics;
}

export type FieldType = CreateProductionTemplateData;
