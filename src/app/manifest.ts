import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/",
        name: "Flow Mail",
        short_name: "Flow",
        description: "Secure access-key protected Flow mailbox.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
        orientation: "any",
        theme_color: "#0f766e",
        background_color: "#f5f7fb",
        lang: "en",
        dir: "ltr",
        categories: ["communication", "productivity", "business"],
        icons: [
            {
                src: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icon.svg",
                sizes: "any",
                type: "image/svg+xml",
                purpose: "any",
            },
        ],
        shortcuts: [
            {
                name: "Inbox",
                short_name: "Inbox",
                url: "/",
                icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
            },
            {
                name: "Access key",
                short_name: "Sign in",
                url: "/login",
                icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
            },
            {
                name: "Activate key",
                short_name: "Register",
                url: "/register",
                icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
            },
        ],
    };
}
