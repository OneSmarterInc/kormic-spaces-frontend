import { createRoot } from 'react-dom/client';
import SpacesApp from './spaces/SpacesApp.web';
import './styles.css';

createRoot(document.getElementById('root')!).render(<SpacesApp />);
