
import { createRoot } from 'react-dom/client'
// Import our mock configuration first to ensure it's available
import './mocks/config'
import App from './App.tsx'
import './index.css'

// Output a helpful message about using mock modules
console.log('Application started - using mock modules for development');
console.log('Please install required dependencies:');
console.log('- npm install -g vite');
console.log('- npm install lucide-react date-fns @tanstack/react-query');

// Create the root element and render the app
createRoot(document.getElementById("root")!).render(<App />);
