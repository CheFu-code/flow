import { FlowMark } from "../brand/FlowMark";
import { AlertCircle, KeyRound, Loader2, ShieldCheck } from "lucide-react";
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

    return (
        <main className={styles.shell}>
            <div className={styles.glow} />

            <section className={styles.panel} aria-label="Flow access">
                <div className={styles.header}>
                    <div className={styles.logoWrap}>
                        <FlowMark className={styles.brandMark} size="lg" />
                    </div>


                    <h1>Welcome back.</h1>

                    <p>
                        Enter your employee access key to continue to your
                        workspace.
                    </p>
                </div>

                <form className={styles.form} onSubmit={submitAccessKey}>
                    <label className={styles.keyField}>
                        <span>Access key</span>

                        <div className={styles.inputWrap}>
                            <KeyRound size={18} strokeWidth={1.8} />

                            <input
                                autoComplete="one-time-code"
                                autoFocus
                                disabled={isLoading}
                                inputMode="text"
                                onChange={(event) =>
                                    setAccessKey(event.target.value)
                                }
                                placeholder="FLOW-XXXX-XXXX"
                                type="password"
                                value={accessKey}
                            />
                        </div>
                    </label>

                    {error ? (
                        <p className={styles.error} role="alert">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </p>
                    ) : null}

                    <button
                        className={styles.submitButton}
                        disabled={isLoading || !accessKey.trim()}
                        type="submit"
                    >
                        {isLoading ? (
                            <Loader2 className={styles.spin} size={18} />
                        ) : (
                            <ShieldCheck size={18} />
                        )}

                        <span>
                            {isCheckingSession
                                ? "Checking session"
                                : isSubmitting
                                  ? "Verifying access"
                                  : "Continue to Flow"}
                        </span>
                    </button>
                </form>

                <div className={styles.divider}>
                    <span />
                    <small>SECURE EMPLOYEE ACCESS</small>
                    <span />
                </div>

                <div className={styles.footer}>
                    <p>
                        Don&apos;t have an access key?
                    </p>

                    <Link
                        href={`/register?next=${encodeURIComponent(nextPath)}`}
                    >
                        Activate your key
                        <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </section>

            <p className={styles.legal}>
                Authorized employees only
            </p>
        </main>
    );
};

export default LoginUI;
