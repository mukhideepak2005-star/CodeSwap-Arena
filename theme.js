(() => {
    const STORAGE_KEY = "hii_theme";
    const root = document.documentElement;

    const readStoredTheme = () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === "light" || stored === "dark" ? stored : null;
    };

    const getPreferredTheme = () => {
        const stored = readStoredTheme();
        if (stored) return stored;
        if (window.matchMedia) {
            return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
        return "dark";
    };

    const updateButtons = (theme) => {
        const nextLabel = theme === "dark" ? "Bright mode" : "Dark mode";
        document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
            btn.textContent = nextLabel;
            btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
            btn.dataset.theme = theme;
        });
    };

    const applyTheme = (theme, persist = true) => {
        root.setAttribute("data-theme", theme);
        if (persist) {
            localStorage.setItem(STORAGE_KEY, theme);
        }
        updateButtons(theme);
    };

    const init = () => {
        const theme = getPreferredTheme();
        applyTheme(theme, false);

        document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const current = root.getAttribute("data-theme") || "dark";
                const next = current === "dark" ? "light" : "dark";
                applyTheme(next);
            });
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
