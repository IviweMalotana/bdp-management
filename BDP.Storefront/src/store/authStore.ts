"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  jwt: string | null;
  userId: string | null;
  firstName: string | null;
  email: string | null;
  accountType: string | null;
  b2bStatus: 'NA' | 'Pending' | 'Approved' | null;
  setAuth: (data: {
    token: string;
    userId: string;
    firstName: string;
    email: string;
    accountType?: string;
    b2bStatus?: string;
  }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      jwt: null,
      userId: null,
      firstName: null,
      email: null,
      accountType: null,
      b2bStatus: null,
      setAuth: (data) =>
        set({
          jwt: data.token,
          userId: data.userId,
          firstName: data.firstName,
          email: data.email,
          accountType: data.accountType ?? "B2C",
          b2bStatus: (data.b2bStatus as AuthState['b2bStatus']) ?? "NA",
        }),
      clearAuth: () =>
        set({ jwt: null, userId: null, firstName: null, email: null, accountType: null, b2bStatus: null }),
    }),
    { name: "bdp-auth" }
  )
);
