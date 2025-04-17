
// This file contains configuration for mocking modules
// Include this in your main entry file or configure your build system to use it

// Import the mocks
import * as lucideReact from './lucide-react';
import * as dateFns from './date-fns';

// Export the mocks so they can be referenced elsewhere
export { lucideReact, dateFns };

// Configure TypeScript module augmentation to recognize our mocks
declare global {
  interface Window {
    mockModules: {
      lucideReact: typeof lucideReact;
      dateFns: typeof dateFns;
    };
  }
}

// Make mocks available globally for debugging
window.mockModules = {
  lucideReact,
  dateFns,
};

console.log('Mock modules loaded for development');
