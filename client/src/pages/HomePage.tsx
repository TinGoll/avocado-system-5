import { DingtalkOutlined, TwitterOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import type { FC } from 'react';

import { CreateColorButton } from '@features/create-color';
import { CreateFacadePanelButton } from '@features/create-facade-panel';
import { CreateFacadeProfileButton } from '@features/create-facade-profile';
import { CreateMaterialButton } from '@features/create-material';
import { CreateOrderForm } from '@features/create-orders';
import { CreatePatinaButton } from '@features/create-patina';
import { PriceModifierForm } from '@features/create-price-modifiers';
import { CreateProductionOperationButton } from '@features/create-production-operation';
import { CreateVarnishButton } from '@features/create-varnish';

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
        <CreateOrderForm />
      </div>

      <div>
        <PriceModifierForm />
      </div>
    </div>
  );
};
