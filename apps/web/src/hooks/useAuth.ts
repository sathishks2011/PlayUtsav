import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getProfileThunk } from '../store/slices/authSlice';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, status, error } = useAppSelector((s) => s.auth);

  // Restore authentication from cookie on mount
  useEffect(() => {
    if (status === 'idle') {
      dispatch(getProfileThunk());
    }
  }, [status, dispatch]);

  return {
    user,
    status,
    error,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading' || status === 'idle',
  };
}
