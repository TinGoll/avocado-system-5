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
const CatalogPage = lazy(() =>
  import('@pages/catalogs').then(({ CatalogPage }) => ({
    default: CatalogPage,
  })),
);

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
        <Route
          path={ROUTES.customers}
          element={withPageLoadingFallback(<CatalogPage catalog="customers" />)}
        />
        <Route
          path={ROUTES.materials}
          element={withPageLoadingFallback(<CatalogPage catalog="materials" />)}
        />
        <Route
          path={ROUTES.colors}
          element={withPageLoadingFallback(<CatalogPage catalog="colors" />)}
        />
        <Route
          path={ROUTES.facadePanels}
          element={withPageLoadingFallback(
            <CatalogPage catalog="facade-panels" />,
          )}
        />
        <Route
          path={ROUTES.facadeProfiles}
          element={withPageLoadingFallback(
            <CatalogPage catalog="facade-profiles" />,
          )}
        />
        <Route
          path={ROUTES.patinas}
          element={withPageLoadingFallback(<CatalogPage catalog="patinas" />)}
        />
        <Route
          path={ROUTES.varnishes}
          element={withPageLoadingFallback(<CatalogPage catalog="varnishes" />)}
        />
        <Route
          path={ROUTES.productionOperations}
          element={withPageLoadingFallback(
            <CatalogPage catalog="production-operations" />,
          )}
        />
        <Route
          path={ROUTES.products}
          element={withPageLoadingFallback(<CatalogPage catalog="products" />)}
        />
        <Route path="*" element={<div>Страница не найдена</div>} />
      </Route>
    </Route>
  </Routes>
);
