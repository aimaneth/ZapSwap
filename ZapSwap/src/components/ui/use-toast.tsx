import { useState } from "react";

type ToastType = "default" | "destructive";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastType;
  duration?: number;
}

interface Toast extends ToastOptions {
  id: number;
}

let toastCount = 0;

// Simple toast implementation that doesn't depend on external libraries
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (options: ToastOptions) => {
    const id = toastCount++;
    const newToast: Toast = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || "default",
      duration: options.duration || 5000,
    };

    setToasts((prevToasts) => [...prevToasts, newToast]);

    // Auto dismiss after duration
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
    }, newToast.duration);

    return id;
  };

  const dismiss = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  };

  return { toast, dismiss, toasts };
}

// Simple mock implementation for direct imports
let mockToasts: Toast[] = [];

export const toast = (options: ToastOptions) => {
  const id = toastCount++;
  const newToast: Toast = {
    id,
    title: options.title,
    description: options.description,
    variant: options.variant || "default",
    duration: options.duration || 5000,
  };

  mockToasts.push(newToast);

  // In a real implementation, this would render a toast component
  // For now, we'll just console log it
  console.log(`Toast: ${newToast.variant} - ${newToast.title}: ${newToast.description}`);

  // Auto dismiss after duration
  setTimeout(() => {
    mockToasts = mockToasts.filter((t) => t.id !== id);
  }, newToast.duration);

  return id;
}; 