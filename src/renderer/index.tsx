import { createRoot } from 'react-dom/client';
import { LocaleRoot } from './Locale';
import { App } from './App';
createRoot(document.getElementById('root')!).render(<LocaleRoot><App/></LocaleRoot>);
