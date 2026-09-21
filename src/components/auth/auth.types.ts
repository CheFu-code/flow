import type { ReactNode } from 'react';
import {
    type AuthenticatedFlowSession,
} from './useAuthGate';

export type AuthGateProps = {
    children: (props: {
        onLock: () => Promise<void>;
        session: AuthenticatedFlowSession;
    }) => ReactNode;
};

export type FlowAccessResponse = {
  error?: string;
  expiresAt?: string;
  granted: boolean;
  keyLabel?: string;
};