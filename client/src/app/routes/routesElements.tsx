import type { JSX } from 'react';
import { Route, Routes } from 'react-router';

import { HomePage } from '@pages/HomePage';
import { AppLayout, DashboardLayout } from '@shared/layouts';

export const routesElements = (): JSX.Element => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route element={<DashboardLayout navbar={<div>Навбар</div>} />}>
        <Route index element={<HomePage />} />
        <Route path="*" element={<div>Страница не найдена</div>} />
      </Route>
    </Route>
  </Routes>
);
