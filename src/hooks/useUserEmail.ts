import { useState, useCallback } from 'react';

const EMAIL_KEY = 'travel-user-email';

export function useUserEmail() {
  const [email, setEmailState] = useState<string | null>(() => {
    return localStorage.getItem(EMAIL_KEY);
  });

  const setEmail = useCallback((newEmail: string) => {
    localStorage.setItem(EMAIL_KEY, newEmail);
    setEmailState(newEmail);
  }, []);

  const clearEmail = useCallback(() => {
    localStorage.removeItem(EMAIL_KEY);
    setEmailState(null);
  }, []);

  return { email, setEmail, clearEmail };
}
