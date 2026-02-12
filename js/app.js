// Entry point: wire up UI handlers and kick off data loading.

function init() {
    // ── Apply timeline-specific configuration ──
    document.title = activeTimeline.pageTitle;
    if (activeTimeline.themeClass) {
        document.body.classList.add(activeTimeline.themeClass);
    }
    // Read the color palette from CSS variables (theme class must be applied first)
    const cssPalette = readColorPaletteFromCSS();
    if (cssPalette) {
        colorPalette = cssPalette;
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
    init();
}

