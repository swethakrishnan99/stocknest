import { createContext, useContext } from "react";
import type { CloudBackend } from "../lib/cloud/backend";

/**
 * off: no cloud in this build; loading: checking for a saved session; signedOut; needsCode: signed
 * in but the two-step code hasn't been entered; signedIn; recovery: opened a password-reset link
 */
export type AuthStatus = "off" | "loading" | "signedOut" | "needsCode" | "signedIn" | "recovery";

export interface TotpEnrollment {
  factorId: string;
  qrCode: string; // SVG markup
  secret: string;
}

export interface Auth {
  status: AuthStatus;
  enabled: boolean;
  backend: CloudBackend | null;
  user: { id: string; email: string; name: string } | null;
  hasTwoStep: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  setNewPassword: (password: string) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  startTwoStep: () => Promise<TotpEnrollment>;
  finishTwoStep: (factorId: string, code: string) => Promise<void>;
  turnOffTwoStep: () => Promise<void>;
}

const OFF: Auth = {
  status: "off",
  enabled: false,
  backend: null,
  user: null,
  hasTwoStep: false,
  signUp: async () => ({ needsConfirmation: false }),
  signIn: async () => {},
  signOut: async () => {},
  sendPasswordReset: async () => {},
  setNewPassword: async () => {},
  verifyCode: async () => {},
  startTwoStep: async () => ({ factorId: "", qrCode: "", secret: "" }),
  finishTwoStep: async () => {},
  turnOffTwoStep: async () => {},
};

export const AuthContext = createContext<Auth>(OFF);

/** Sign-in state and actions. Outside AuthProvider (and in tests) the cloud is simply off. */
export const useAuth = () => useContext(AuthContext);
