"use client";

import { apiUrl } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FlowAccessResponse } from "./auth.types";
import { useAuthGate } from "./useAuthGate";
import LoginUI from "./LoginUI";

export function LoginClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { submitAccessKey, error, isSubmitting, accessKey, setAccessKey } =
        useAuthGate();
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const nextPath = useMemo(() => {
        const value = searchParams.get("next") || "/";
        return value.startsWith("/") ? value : "/";
    }, [searchParams]);

    useEffect(() => {
        let active = true;

        fetch(apiUrl("/flow/access/session"), {
            cache: "no-store",
            credentials: "include",
        })
            .then((response) => response.json())
            .then((session: FlowAccessResponse) => {
                if (!active) return;

                if (session.granted) {
                    router.replace(nextPath);
                    return;
                }

                setIsCheckingSession(false);
            })
            .catch(() => {
                if (active) setIsCheckingSession(false);
            });

        return () => {
            active = false;
        };
    }, [nextPath, router]);

    return (
        <LoginUI
            submitAccessKey={submitAccessKey}
            isCheckingSession={isCheckingSession}
            isSubmitting={isSubmitting}
            setAccessKey={setAccessKey}
            accessKey={accessKey}
            error={error}
            nextPath={nextPath}
        />
    );
}
