"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";
import { FlowAccessResponse } from "./auth.types";

export type FlowAccessSession =
    | {
        granted: true;
        expiresAt: string;
        keyLabel: string;
        permission: "read" | "write" | "full";
    }
    | { granted: false; expiresAt?: never; keyLabel?: never };

export type AuthenticatedFlowSession = Extract<
    FlowAccessSession,
    { granted: true }
>;

export type AuthGateState =
    | { message: string; status: "checking" }
    | { message: null; session: AuthenticatedFlowSession; status: "ready" }
    | { message: string; status: "error" };

export function useAuthGate() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const nextPath = useMemo(() => pathname || "/", [pathname]);
    const theNextPath = useMemo(() => {
        const value = searchParams.get("next") || "/";
        return value.startsWith("/") ? value : "/";
    }, [searchParams]);
    const [error, setError] = useState("");
    const [accessKey, setAccessKey] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gateState, setGateState] = useState<AuthGateState>({
        message: "Checking Flow access key...",
        status: "checking",
    });

    useEffect(() => {
        let active = true;

        fetch(apiUrl("/flow/access/session"), {
            cache: "no-store",
            credentials: "include",
        })
            .then((response) => response.json())
            .then((session: FlowAccessSession) => {
                if (!active) return;

                if (session.granted) {
                    setGateState({ message: null, session, status: "ready" });
                    return;
                }

                router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
            })
            .catch((error) => {
                if (!active) return;
                setGateState({
                    message:
                        error instanceof Error
                            ? error.message
                            : "Flow access could not be checked.",
                    status: "error",
                });
            });

        return () => {
            active = false;
        };
    }, [nextPath, router]);

    const handleEnterKey = useCallback(() => {
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }, [nextPath, router]);

    const handleLock = useCallback(async () => {
        await fetch(apiUrl("/flow/access/session"), {
            credentials: "include",
            method: "DELETE",
        });
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        router.refresh();
    }, [nextPath, router]);

    const submitAccessKey = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const response = await fetch(apiUrl("/flow/access/login"), {
                body: JSON.stringify({ code: accessKey }),
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                method: "POST",
            });
            const data = (await response.json()) as FlowAccessResponse;

            if (!response.ok || !data.granted) {
                throw new Error(data.error || "That Flow key is not active.");
            }

            router.replace(theNextPath);
            router.refresh();
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "That Flow key is not active.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        gateState,
        handleEnterKey,
        handleLock,
        submitAccessKey,
        isSubmitting,
        error,
        setAccessKey,
        accessKey
    };
}
