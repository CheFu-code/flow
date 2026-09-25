'use client';

import { FlowMark } from '@/components/brand/FlowMark';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import styles from './AuthGate.module.css';
import { AuthGateProps } from './auth.types';
import {
    useAuthGate
} from './useAuthGate';

export function AuthGate({ children }: AuthGateProps) {
    const { gateState, handleEnterKey, handleLock } = useAuthGate();

    if (gateState.status === 'checking') {
        return (
            <main className={styles.shell}>
                <div className={styles.loadingPanel} role="status" aria-live="polite">
                    <div className={styles.loadingIdentity}>
                        <FlowMark className={styles.brandMark} size="sm" />
                        <div>
                            <span className={styles.productLabel}>Flow Mail</span>
                            <span className={styles.secureLabel}>Private workspace</span>
                        </div>
                    </div>
                    <div className={styles.loadingCopy}>
                        <span className={styles.statusLabel}>
                            <span className={styles.statusDot} />
                            Verifying access
                        </span>
                        <h1>Preparing your inbox</h1>
                        <p>{gateState.message}</p>
                    </div>
                    <div className={styles.progressTrack} aria-hidden="true">
                        <span className={styles.progressBar} />
                    </div>
                    <div className={styles.loadingFooter}>
                        <Loader2 className={styles.loader} aria-hidden="true" />
                        <span>Encrypted session check</span>
                    </div>
                </div>
            </main>
        );
    }

    if (gateState.status === 'error') {
        return (
            <main className={styles.shell}>
                <Card className={styles.card} size="sm">
                    <CardHeader className={styles.header}>
                        <div className={styles.errorMark} aria-hidden="true">
                            <AlertCircle className="size-5" />
                        </div>
                        <CardTitle>Access needs attention</CardTitle>
                        <CardDescription>
                            Flow could not confirm your key.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className={styles.errorContent}>
                        <Alert className={styles.alert} variant="destructive">
                            <AlertCircle className="size-4" />
                            <AlertDescription>{gateState.message}</AlertDescription>
                        </Alert>
                        <Button
                            type="button"
                            className={styles.retryButton}
                            onClick={handleEnterKey}
                        >
                            <LogIn className="size-4" />
                            Enter access key
                        </Button>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return children({
        onLock: handleLock,
        session: gateState.session,
    });
}