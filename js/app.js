// Entry point: wire up UI handlers and kick off data loading.

// Load settings.json for runtime overrides (title, logo, category colors).
const DEFAULT_PAGE_TITLE = 'ציר זמן אינטרקטיבי';
async function loadSettings() {
    try {
        const response = await fetch('static/events-files/settings.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return data && typeof data === 'object' ? data : {};
    } catch (error) {
        console.warn('Failed to load settings.json, using defaults.', error);
        return {};
    }
}

async function init() {
    // ── Apply timeline-specific configuration ──
    document.title = activeTimeline.pageTitle;
    if (activeTimeline.themeClass) {
        document.body.classList.add(activeTimeline.themeClass);
    }
    // Apply per-timeline title image in header and info modal (if configured)
    const titleImageConfig = activeTimeline.titleImage;
    const headerTitleImageEl = document.getElementById('timelineTitleImage');
    const infoModalTitleImageEl = document.getElementById('infoModalTitleImage');

    [headerTitleImageEl, infoModalTitleImageEl].forEach((imgEl) => {
        if (!imgEl) return;
        if (titleImageConfig && titleImageConfig.src) {
            imgEl.src = titleImageConfig.src;
            imgEl.alt = titleImageConfig.alt || '';
            imgEl.style.display = 'block';
        } else {
            imgEl.style.display = 'none';
        }
    });
    // Read the color palette from CSS variables (theme class must be applied first)
    const cssPalette = readColorPaletteFromCSS();
    let basePalette = colorPalette;
    if (cssPalette) {
        basePalette = cssPalette;
        colorPalette = cssPalette;
    }

    // Apply overrides from settings.json (title, logo, category colors)
    const settings = await loadSettings();

    // Title override:
    // - If settings.title is a non-empty string, use it.
    // - Otherwise, fall back to DEFAULT_PAGE_TITLE.
    let finalTitle = null;
    if (settings && typeof settings.title === 'string') {
        const trimmedTitle = settings.title.trim();
        if (trimmedTitle) {
            finalTitle = trimmedTitle;
        }
    }
    if (!finalTitle) {
        finalTitle = DEFAULT_PAGE_TITLE;
    }
    document.title = finalTitle;

    // Logo override:
    // - If settings.logo_url is the string "none" (case-insensitive), hide the logo entirely.
    // - Otherwise, if logo_url is a non-empty string, use it as the logo image src.
    if (settings && typeof settings.logo_url === 'string') {
        const trimmedLogoUrl = settings.logo_url.trim();
        const brandSticker = document.querySelector('.brand-sticker');
        const brandLogoImg = brandSticker ? brandSticker.querySelector('img') : null;

        if (trimmedLogoUrl.toLowerCase() === 'none') {
            if (brandSticker) {
                brandSticker.style.display = 'none';
            }
            // When there is no logo, bring the categories menu closer to the top
            document.body.classList.add('no-logo');
        } else if (trimmedLogoUrl && brandLogoImg) {
            brandLogoImg.src = trimmedLogoUrl;
        }
    }

    // Color palette override: prepend category_colors and remove duplicates, keeping first occurrence
    if (settings && Array.isArray(settings.category_colors) && settings.category_colors.length > 0) {
        colorPalette = buildColorPaletteWithCategoryColors(basePalette, settings.category_colors);
    }

    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    if (zoomMinBtn) zoomMinBtn.addEventListener('click', zoomToMin);
    if (zoomMaxBtn) zoomMaxBtn.addEventListener('click', zoomToMax);

    setZoomButtonStates();

    window.addEventListener('popstate', handlePopState);

    setupWheelZoom();
    const modal = document.getElementById('eventModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    modalCloseBtn.addEventListener('click', closeEventModal);

    const prevEventBtn = document.getElementById('prevEventBtn');
    const nextEventBtn = document.getElementById('nextEventBtn');

    if (prevEventBtn) {
        prevEventBtn.addEventListener('click', showPreviousEvent);
    }

    if (nextEventBtn) {
        nextEventBtn.addEventListener('click', showNextEvent);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeEventModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeEventModal();
        }
    });

    setupTimelineDrag();
    setupStickyTitlesOnScroll();
    setupMinimapInteractions();
    setupTouchZoom();
    loadInfo();
    loadEvents();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // init is async; we intentionally do not await it here.
    init();
}

