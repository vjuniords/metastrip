import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MetaStripApp } from '@metastrip/ui';
import '@/assets/style.css';

const openFull = () => {
  browser.tabs.create({ url: browser.runtime.getURL('/app.html') });
  window.close();
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MetaStripApp variant="popup" onOpenFull={openFull} />
  </StrictMode>,
);
