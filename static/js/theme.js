document.addEventListener("DOMContentLoaded", function () {

    const themeButton = document.getElementById("themeToggle");

    function applyTheme(theme) {

        const isDark = theme === "dark";

        document.body.classList.toggle(
            "dark-theme",
            isDark
        );

        document.body.setAttribute(
            "data-theme",
            isDark ? "dark" : "light"
        );

        if (themeButton) {
            themeButton.textContent =
                isDark ? "☀️" : "🌙";

            themeButton.setAttribute(
                "aria-label",
                isDark
                    ? "Switch to light mode"
                    : "Switch to dark mode"
            );

            themeButton.setAttribute(
                "title",
                isDark
                    ? "Switch to light mode"
                    : "Switch to dark mode"
            );
        }
    }


    /* -----------------------------------------------------
       LOAD SAVED THEME
       ----------------------------------------------------- */

    const savedTheme =
        localStorage.getItem("theme");

    if (savedTheme === "dark") {
        applyTheme("dark");
    } else {
        applyTheme("light");
    }


    /* -----------------------------------------------------
       THEME BUTTON
       ----------------------------------------------------- */

    if (themeButton) {

        themeButton.addEventListener(
            "click",
            function () {

                const isDark =
                    document.body.classList.contains(
                        "dark-theme"
                    );

                const newTheme =
                    isDark ? "light" : "dark";

                localStorage.setItem(
                    "theme",
                    newTheme
                );

                applyTheme(newTheme);
            }
        );
    }

});