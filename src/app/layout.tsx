import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
    title: "Flow",
    description: "CHEFU TECHNOLOGIES email ecosystem.",
    icons: {
        icon: "/icon.svg",
        shortcut: "/icon.svg",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className="h-full antialiased flow-document"
            suppressHydrationWarning
        >
            <body className="flow-body">
                <Providers>
                    {children}
                    <Analytics />
                </Providers>
            </body>
        </html>
    );
}
