// Dark/light theme. The inline script in templates/includes/head.html sets
// <html data-theme> before first paint, from localStorage or the OS setting.
// Clicking the toggle stores an explicit choice. With no stored choice, the
// page follows the OS setting, including changes while it is open.
(function () {
    'use strict';

    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function stored() {
        try {
            var t = localStorage.getItem('theme');
            return t === 'light' || t === 'dark' ? t : null;
        } catch (e) {
            return null;
        }
    }

    window.toggleTheme = function () {
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
    };

    if (media && media.addEventListener) {
        media.addEventListener('change', function (e) {
            if (!stored()) {
                document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            }
        });
    }
})();
