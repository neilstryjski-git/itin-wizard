import { useState, useCallback } from 'react';

const EMAIL_KEY = 'travel-user-email';

export function useUserEmail() {
  const [email, setEmailState] = useState<string | null>(() => {
    const stored = localStorage.getItem(EMAIL_KEY);
    return stored ? stored.trim().toLowerCase() : null;
  });

  const setEmail = useCallback((newEmail: string) => {
    const normalized = newEmail.trim().toLowerCase();
    localStorage.setItem(EMAIL_KEY, normalized);
    setEmailState(normalized);
  }, []);

  const clearEmail = useCallback(() => {
    localStorage.removeItem(EMAIL_KEY);
    setEmailState(null);
  }, []);

  return { email, setEmail, clearEmail };
}
