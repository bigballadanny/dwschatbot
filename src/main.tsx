
import { createRoot } from 'react-dom/client'
// Import our mock configuration
import './mocks/config'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Add a helpful console message for developers
console.log('Application started - using mock modules for development until dependencies are installed');
