import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,                // App is now the layout shell
    children: [
      { index: true, element: <Index /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  </React.StrictMode>
);
