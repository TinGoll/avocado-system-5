import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    files: ['./src/**/*'],
    rules: {
      // Existing CRUD actions are intentional business slices even when
      // currently composed by a single widget or page.
      'fsd/insignificant-slice': 'off',
      // Providers, assets and colocated React hooks are established,
      // purpose-specific segments in this application.
      'fsd/segments-by-purpose': 'off',
      // Domain terminology legitimately mixes singular aggregate names
      // with plural collections such as price-modifiers.
      'fsd/inconsistent-naming': 'off',
    },
  },
]);
