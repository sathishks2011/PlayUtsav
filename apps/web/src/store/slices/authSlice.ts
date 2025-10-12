import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as api from '../../lib/api';

type AuthState = {
  user: api.User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  error?: string;
};

const initialState: AuthState = {
  user: null,
  status: 'idle',
};

export const signupThunk = createAsyncThunk(
  'auth/signup',
  async (payload: {
    email: string;
    password: string;
    displayName?: string;
    organization?: string;
    contactEmail?: string;
  }) => {
    const user = await api.signup(payload);
    return user;
  }
);

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }) => {
    const user = await api.login(payload);
    return user;
  }
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await api.logout();
});

export const getProfileThunk = createAsyncThunk('auth/getProfile', async () => {
  const user = await api.getProfile();
  return user;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    reset: () => initialState,
    setUser(state, action: PayloadAction<api.User | null>) {
      state.user = action.payload;
      state.status = action.payload ? 'authenticated' : 'unauthenticated';
    },
    clearError(state) {
      state.error = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      // Signup
      .addCase(signupThunk.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(signupThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      // Login
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      // Logout
      .addCase(logoutThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
        state.error = undefined;
      })
      .addCase(logoutThunk.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      // Get Profile
      .addCase(getProfileThunk.pending, (state) => {
        if (state.status === 'idle') {
          state.status = 'loading';
        }
      })
      .addCase(getProfileThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = action.payload ? 'authenticated' : 'unauthenticated';
      })
      .addCase(getProfileThunk.rejected, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
      });
  },
});

export const { reset: resetAuth, setUser, clearError } = authSlice.actions;
export default authSlice.reducer;
