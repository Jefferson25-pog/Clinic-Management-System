// src/hooks/useBrowserStorage.js
import { useCallback } from "react";

const isBrowser = typeof window !== "undefined";

export const useBrowserStorage = () => {
  const getItem = useCallback((key) => {
    if (!isBrowser) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get ${key} from localStorage:`, error);
      return null;
    }
  }, []);

  const setItem = useCallback((key, value) => {
    if (!isBrowser) return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Failed to set ${key} to localStorage:`, error);
    }
  }, []);

  const removeItem = useCallback((key) => {
    if (!isBrowser) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
    }
  }, []);

  const clear = useCallback(() => {
    if (!isBrowser) return;
    try {
      localStorage.clear();
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }
  }, []);

  return { getItem, setItem, removeItem, clear, isBrowser };
};