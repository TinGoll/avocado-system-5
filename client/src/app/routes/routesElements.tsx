import type { JSX } from 'react';
import { Route, Routes } from 'react-router';

import BasePage from '@pages/BasePage';
import { HomePage } from '@pages/HomePage';
import { AppLayout } from '@shared/layouts';

export const routesElements = (): JSX.Element => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route element={<BasePage />}>
        <Route index element={<HomePage />} />
        <Route path="*" element={<div>Страница не найдена</div>} />
      </Route>
    </Route>
  </Routes>
);
