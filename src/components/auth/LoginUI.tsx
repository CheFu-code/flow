import { FlowMark } from "../brand/FlowMark";
import { AlertCircle, Loader2 } from "lucide-react";
import styles from "./LoginClient.module.css";
import Link from "next/link";
import { Dispatch, FormEvent, SetStateAction } from "react";

const LoginUI = ({
    submitAccessKey,
    isCheckingSession,
    isSubmitting,
    setAccessKey,
    accessKey,
    error,
    nextPath,
}: {
    submitAccessKey: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    isCheckingSession: boolean;
    isSubmitting: boolean;
    setAccessKey: Dispatch<SetStateAction<string>>;
    accessKey: string;
    error: string;
    nextPath: string;
}) => {
    const isLoading = isCheckingSession || isSubmitting;

    const statusLabel = isCheckingSession
        ? "Checking"
        : isSubmitting
          ? "Verifying"
          : "Ready";

    const buttonLabel = isCheckingSession
        ? "Checking session"
        : isSubmitting
          ? "Verifying key"
          : "Unlock access";

    return (
        <main className={styles.shell}>
            <section className={styles.panel} aria-label="Flow access">
                <div className={styles.topbar}>
                    <div className={styles.brand}>
                        <FlowMark className={styles.brandMark} size="sm" />
                        <span>Flow</span>
                    </div>

                    <div className={styles.status} data-loading={isLoading}>
                        <span className={styles.statusDot} aria-hidden="true" />
                        <span>{statusLabel}</span>
                    </div>
                </div>

                <div className={styles.intro}>
                    <h1>Employee access</h1>
                    <p>Enter the access key issued by your workspace admin.</p>
                </div>

                <form className={styles.form} onSubmit={submitAccessKey}>
                    <label className={styles.keyField}>
                        <span>Access key</span>

                        <input
                            autoComplete="one-time-code"
                            autoFocus
                            disabled={isLoading}
                            inputMode="text"
                            onChange={(event) =>
                                setAccessKey(event.target.value)
                            }
                            placeholder="FLOW-0000-0000"
                            type="password"
                            value={accessKey}
                        />
                    </label>

                    {error ? (
                        <p className={styles.error} role="alert">
                            <AlertCircle size={15} />
                            <span>{error}</span>
                        </p>
                    ) : null}

                    <button
                        className={styles.submitButton}
                        disabled={isLoading || !accessKey.trim()}
                        type="submit"
                    >
                        {isLoading ? (
                            <Loader2 className={styles.spin} size={16} />
                        ) : null}
                        <span>{buttonLabel}</span>
                    </button>
                </form>
            </section>

        </main>
    );
};

export default LoginUI;