import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Global notifications */}
        <Toaster richColors position="top-right" />
        {/* Child routes render here */}
        <Outlet />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
