import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import { enableMocking } from './providers/enableMocking';

import './reset.css';
import './index.css';

await enableMocking();

createRoot(document.getElementById('root')!).render(<App />);
