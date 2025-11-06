import type { JSX } from 'react';
import { Route, Routes } from 'react-router';

import BasePage from '@pages/BasePage';
import { HomePage } from '@pages/HomePage';
import OrderEditPage from '@pages/OrderEditPage';
import OrderPage from '@pages/OrderPage';
import OrderPrintPage from '@pages/OrderPrintPage';
import { AppLayout } from '@shared/layouts';

import { ROUTES } from './routes';

export const routesElements = (): JSX.Element => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route element={<BasePage />}>
        <Route index element={<HomePage />} />
        <Route path={ROUTES.orderEdit} element={<OrderEditPage />} />
        <Route path={ROUTES.orderPrint} element={<OrderPrintPage />} />
        <Route path={ROUTES.order} element={<OrderPage />} />
        <Route path="*" element={<div>Страница не найдена</div>} />
      </Route>
    </Route>
  </Routes>
);
