
# DWS AI Project

## Important: Development Setup

This project requires several dependencies to be installed. To set up the development environment properly:

### 1. Install required packages:

```bash
# First, install Vite globally:
npm install -g vite

# Then install project dependencies:
npm install lucide-react date-fns @tanstack/react-query
```

### 2. Start the development server:

```bash
npm run dev
```

## About the Mock System

Until you install the required dependencies, the application uses mock implementations for:
- lucide-react
- date-fns 
- @tanstack/react-query

These mocks are located in `src/mocks/` and provide basic functionality to allow the application to load even without the actual dependencies.

## Known Issues

If you're experiencing the "vite: not found" error, ensure you have installed vite globally:
```bash
npm install -g vite
```

## Project Structure

- `/src` - Application source code
  - `/components` - UI components
  - `/mocks` - Mock modules for development
  - `/lib` - Utility functions and shared code

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the production version
