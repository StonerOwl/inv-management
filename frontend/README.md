# Frontend UI

This folder contains the React frontend for the Invoice AI platform, built using Vite, TailwindCSS, and React Router.

## Directory Structure

- `/public` - Static assets (like `favicon.ico`) served directly by the web server.
- `/src` - The main source code directory.
  - `/api` - Axios HTTP clients (`client.js`) for communicating with the backend API.
  - `/assets` - Images and other imported static files.
  - `/components` - Reusable UI components (Modals, Navigation, Forms, Icons).
    - `AppLayout.jsx` - The main dashboard layout wrapper.
  - `/pages` - Top-level page views (e.g., `InventoryDashboard.jsx`, `PurchaseOrders.jsx`, `Login.jsx`).
  - `/hooks` - Custom React hooks (if any) or context providers.
  - `App.jsx` - Main application component where React Router is configured.
  - `index.css` - Global stylesheet (Tailwind directives).
  - `main.jsx` - React entry point.
- `tailwind.config.js` - Configuration for TailwindCSS theme and plugins.
- `vite.config.js` - Vite bundler configuration.
- `replace_colors.cjs` - A helper script to quickly change theme colors across the project.
- `nginx.conf` - Configuration for serving the built frontend via NGINX in production Docker environments.

## Running the Frontend

Ensure you have installed the dependencies first:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```
The frontend will be available at `http://localhost:5173`.
