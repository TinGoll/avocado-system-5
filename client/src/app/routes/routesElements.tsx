import { lazy, Suspense, type JSX, type ReactNode } from 'react';
import { Route, Routes } from 'react-router';

import BasePage from '@pages/base';
import { AppLayout } from '@shared/layouts';

import { ROUTES } from './routes';

const HomePage = lazy(() =>
  import('@pages/home').then(({ HomePage }) => ({ default: HomePage })),
);
const OrderEditPage = lazy(() => import('@pages/order-edit'));
const OrderPage = lazy(() => import('@pages/order'));
const OrderPrintPage = lazy(() => import('@pages/order-print'));
const PriceModifiersPage = lazy(() => import('@pages/price-modifiers'));

const withPageLoadingFallback = (page: ReactNode): JSX.Element => (
  <Suspense
    fallback={
      <div aria-live="polite" role="status">
        Загрузка страницы…
      </div>
    }
  >
    {page}
  </Suspense>
);

export const routesElements = (): JSX.Element => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route element={<BasePage />}>
        <Route index element={withPageLoadingFallback(<HomePage />)} />
        <Route
          path={ROUTES.orderEdit}
          element={withPageLoadingFallback(<OrderEditPage />)}
        />
        <Route
          path={ROUTES.orderPrint}
          element={withPageLoadingFallback(<OrderPrintPage />)}
        />
        <Route
          path={ROUTES.order}
          element={withPageLoadingFallback(<OrderPage />)}
        />
        <Route
          path={ROUTES.priceModifiers}
          element={withPageLoadingFallback(<PriceModifiersPage />)}
        />
        <Route path="*" element={<div>Страница не найдена</div>} />
      </Route>
    </Route>
  </Routes>
);
