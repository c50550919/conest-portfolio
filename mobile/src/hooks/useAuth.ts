/**
 * useAuth Hook
 * Custom hook for authentication operations
 */

import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logout as logoutAction } from '../store/slices/authSlice';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      const { token, refreshToken, userId } = response;

      // Store tokens securely
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('refreshToken', refreshToken);

      // TODO: Update to use loginSuccess instead of deprecated setAuth
      // dispatch(setAuth({ token, refreshToken, userId }));
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('refreshToken');
    dispatch(logoutAction());
  };

  return {
    ...auth,
    login,
    logout,
  };
};
