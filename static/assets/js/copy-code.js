// Copy-to-clipboard for .copy-code blocks. Delegated, so blocks can appear
// anywhere on the page without extra wiring.
document.addEventListener('click', async function(event) {
    const button = event.target.closest('.copy-code-button');
    if (!button) {
        return;
    }

    const block = button.closest('.copy-code, .copy-code-docs');
    const source = block && block.querySelector('code');
    if (!source) {
        return;
    }

    // The icon swap is invisible to screen readers, so the result is also
    // announced through the block's status region.
    const status = block.querySelector('.copy-code-status');

    try {
        await navigator.clipboard.writeText(source.textContent.trim());
        button.classList.add('copied');
        status.textContent = 'Copied to clipboard';
    } catch (error) {
        status.textContent = 'Copy failed';
    }

    setTimeout(function() {
        button.classList.remove('copied');
        status.textContent = '';
    }, 2000);
});

// Code blocks rendered from markdown on topic and command pages get the same
// button as the blocks in templates/macros/release.html.
// Skips .copy-code blocks, which have their own button.
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.left-aside .main-inner pre:not(.copy-code pre)').forEach(function(pre) {
        const block = document.createElement('div');
        block.className = 'copy-code-docs';
        pre.before(block);
        block.append(pre);
        block.insertAdjacentHTML('beforeend', `
            <button type="button" class="copy-code-button" aria-label="Copy code to clipboard" title="Copy">
                <svg class="copy-code-icon copy-code-icon-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <svg class="copy-code-icon copy-code-icon-done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </button>
            <span class="copy-code-status sr-only" role="status"></span>`);
    });
});
