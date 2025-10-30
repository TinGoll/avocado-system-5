import { Select, Space } from 'antd';
import { useMemo } from 'react';

import type { CONDITION_SOURCE } from '@entities/price-modifiers';

import { getLabelForKeyInContext } from '../model/fieldLabels';
import { isSchemaLeaf, schemas } from '../model/pathSchema';

interface PathSelectorProps {
  source: typeof CONDITION_SOURCE.ORDER | typeof CONDITION_SOURCE.ITEM;
  value: string;
  onChange: (path: string) => void;
}

export const PathSelector: React.FC<PathSelectorProps> = ({
  source,
  value,
  onChange,
}) => {
  const schema = schemas[source];
  const pathParts = useMemo(() => (value ? value.split('.') : []), [value]);

  const handleSelect = (part: string, index: number) => {
    const newPathParts = [...pathParts.slice(0, index), part];
    onChange(newPathParts.join('.'));
  };

  const renderSelects = () => {
    const selects = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentLevelSchema: any = schema;
    // eslint-disable-next-line prefer-const
    let currentPathContext: string[] = [];

    for (let i = 0; i <= pathParts.length; i++) {
      if (isSchemaLeaf(currentLevelSchema)) {
        break;
      }

      if (!currentLevelSchema || typeof currentLevelSchema !== 'object') {
        break;
      }

      const options = Object.keys(currentLevelSchema).map((key) => ({
        label: getLabelForKeyInContext(source, currentPathContext, key),
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
        currentPathContext.push(pathParts[i]);
        currentLevelSchema = currentLevelSchema[pathParts[i]];
      } else {
        break;
      }
    }
    return selects;
  };

  return <Space.Compact block>{renderSelects()}</Space.Compact>;
};
