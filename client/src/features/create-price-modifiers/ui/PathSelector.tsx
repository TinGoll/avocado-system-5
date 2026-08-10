import { Select, Space } from 'antd';
import { useMemo } from 'react';

import type { CONDITION_SOURCE } from '@entities/price-modifiers';

import {
  isSchemaLeaf,
  type PriceModifierConditionPathSchemas,
} from '../model/pathSchema';

interface PathSelectorProps {
  source:
    | typeof CONDITION_SOURCE.ORDER
    | typeof CONDITION_SOURCE.ITEM
    | typeof CONDITION_SOURCE.ORDER_GROUP;
  value: string;
  onChange: (path: string) => void;
  schemas: PriceModifierConditionPathSchemas;
}

export const PathSelector: React.FC<PathSelectorProps> = ({
  source,
  value,
  onChange,
  schemas,
}) => {
  const schema = schemas[source];
  const pathParts = useMemo(() => (value ? value.split('.') : []), [value]);

  const handleSelect = (part: string, index: number) => {
    const newPathParts = [...pathParts.slice(0, index), part];
    onChange(newPathParts.join('.'));
  };

  const renderSelects = () => {
    const selects = [];
    let currentLevelSchema = schema;

    for (let i = 0; i <= pathParts.length; i++) {
      if (!currentLevelSchema || typeof currentLevelSchema !== 'object') {
        break;
      }

      const options = Object.entries(currentLevelSchema).map(([key, node]) => ({
        label: node.label,
        value: key,
      }));

      selects.push(
        <Select
          key={i}
          style={{ minWidth: 150 }}
          placeholder="Выберите поле"
          value={pathParts[i]}
          onChange={(selectedValue) => handleSelect(selectedValue, i)}
          options={options}
        />,
      );

      if (pathParts[i]) {
        const node = currentLevelSchema[pathParts[i]];
        if (!node || isSchemaLeaf(node)) break;
        currentLevelSchema = node.children;
      } else {
        break;
      }
    }
    return selects;
  };

  return <Space.Compact block>{renderSelects()}</Space.Compact>;
};
