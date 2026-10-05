import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MetaStripApp } from '@metastrip/ui';
import '@/assets/style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MetaStripApp variant="page" />
  </StrictMode>,
);
