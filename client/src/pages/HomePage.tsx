import { DingtalkOutlined, TwitterOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import type { FC } from 'react';

import { CreateColorButton } from '@features/color-management';
import { CreateFacadePanelButton } from '@features/facade-panel-management';
import { CreateFacadeProfileButton } from '@features/facade-profile-management';
import { CreateMaterialButton } from '@features/material-management';
import { CreatePatinaButton } from '@features/patina-management';
import { PriceModifierForm } from '@features/price-modifiers-management';
import { CreateProductionOperationButton } from '@features/production-operation-management';
import { CreateVarnishButton } from '@features/varnish-management';

const styles = css`
  display: flex;
  gap: 8px;
`;

export const HomePage: FC = () => {
  return (
    <div>
      <div className={styles}>
        <CreateFacadePanelButton
          variant="solid"
          color="gold"
          icon={<TwitterOutlined />}
        />
        <CreateColorButton
          variant="solid"
          color="pink"
          icon={<DingtalkOutlined />}
        />
        <CreateFacadeProfileButton
          variant="solid"
          color="lime"
          icon={<DingtalkOutlined />}
        />
        <CreateMaterialButton
          variant="solid"
          color="orange"
          icon={<DingtalkOutlined />}
        />
        <CreatePatinaButton
          variant="solid"
          color="volcano"
          icon={<DingtalkOutlined />}
        />
        <CreateVarnishButton
          variant="solid"
          color="yellow"
          icon={<DingtalkOutlined />}
        />
        <CreateProductionOperationButton
          variant="solid"
          color="green"
          icon={<DingtalkOutlined />}
        />
      </div>

      <div>
        <PriceModifierForm />
      </div>
    </div>
  );
};
