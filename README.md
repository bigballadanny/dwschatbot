
# DWS AI Project

## Development Setup

This project requires several dependencies to be installed. To set up the development environment:

### 1. Install required packages:

```bash
npm install
npm install -g vite
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

## Firebase Deployment

This project uses GitHub Actions for deployment to Firebase. The workflow is configured in `.github/workflows/firebase.yml`.

## Project Structure

- `/src` - Application source code
- `/functions` - Firebase Cloud Functions 
- `/public` - Static assets

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the production version
- `npm run preview` - Preview the built app locally

## Known Issues

If you're experiencing the "vite: not found" error, ensure you have installed vite globally:
```bash
npm install -g vite
```
