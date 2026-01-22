// Zoom controls for adjusting year width.

const maxZoomIn = 200;
const maxZoomOut = 3.57;

// Preset zoom levels for discrete zoom steps
const zoomLevels = [
    3.57,   // Maximum zoom out (centuries view)
    8,      // Far zoomed out (decades view)
    15,     // Medium zoom out
    30,     // Medium zoom
    50,     // Medium zoom in
    100,    // Zoomed in
    150,    // Very zoomed in
    200     // Maximum zoom in
];

function setZoomButtonStates() {
    if (!zoomInBtn || !zoomOutBtn) return;

    const atMax = yearWidth >= maxZoomIn;
    const atMin = yearWidth <= maxZoomOut;

    zoomInBtn.disabled = atMax;
    if (zoomMaxBtn) zoomMaxBtn.disabled = atMax;
    zoomOutBtn.disabled = atMin;
    if (zoomMinBtn) zoomMinBtn.disabled = atMin;
}

function updateZoom(newYearWidth, options = {}) {
    const scrollable = getTimelineScrollable();
    const anchor = options.anchor || null;
    let anchorInfo = null;

    if (scrollable && scrollable.scrollWidth > 0) {
        const currentScrollWidth = scrollable.scrollWidth;
        if (anchor?.type === 'left') {
            anchorInfo = {
                type: 'left',
                fraction: anchor.fraction ?? (scrollable.scrollLeft / currentScrollWidth)
            };
        } else if (anchor?.type === 'right') {
            anchorInfo = {
                type: 'right',
                fraction: anchor.fraction ?? ((scrollable.scrollLeft + scrollable.clientWidth) / currentScrollWidth)
            };
        } else {
            const currentScrollLeft = scrollable.scrollLeft;
            const viewportCenter = currentScrollLeft + scrollable.clientWidth / 2;
            const centerYear = minYear + (viewportCenter / yearWidth);
            // Keep center anchoring stable while zooming from wheel/pinch.
            const targetCenterYear = anchor?.centerYear ?? centerYear;
            anchorInfo = { type: 'center', centerYear: targetCenterYear };
        }
    }

    isZooming = true;

    yearWidth = newYearWidth;
    if (anchorInfo?.type === 'center') {
        renderTimeline(false, anchorInfo.centerYear);
    } else {
        renderTimeline();
    }

    setTimeout(() => {
        isZooming = false;
        if (anchorInfo && anchorInfo.type !== 'center' && scrollable) {
            // Calculate scroll position based on actual content width (timelineWidth), not scrollWidth
            // This ensures the scroll position stays within content bounds
            const timelineWidth = getTimelineWidth();
            const maxContentScroll = Math.max(0, timelineWidth - scrollable.clientWidth);
            
            let newScrollLeft = anchorInfo.type === 'left'
                ? anchorInfo.fraction * timelineWidth
                : anchorInfo.fraction * timelineWidth - scrollable.clientWidth;

            if (Number.isNaN(newScrollLeft)) {
                newScrollLeft = scrollable.scrollLeft;
            }

            scrollable.scrollLeft = Math.max(0, Math.min(newScrollLeft, maxContentScroll));
            refreshMinimap();
        }
        updateStickyEventTitles();
        
        // Debug: Count minwidth events after zoom change
        const minWidthEvents = eventsLayer?.querySelectorAll('.event[data-min-width="true"]') || [];
        console.log(`[DEBUG] Zoom changed to yearWidth: ${newYearWidth}px | MinWidth events count: ${minWidthEvents.length}`);
    }, 0);

    setZoomButtonStates();
}

function getCurrentZoomLevel() {
    // Find the closest zoom level to current yearWidth
    let closestLevel = zoomLevels[0];
    let minDiff = Math.abs(yearWidth - closestLevel);
    
    for (let i = 0; i < zoomLevels.length; i++) {
        const diff = Math.abs(yearWidth - zoomLevels[i]);
        if (diff < minDiff) {
            minDiff = diff;
            closestLevel = zoomLevels[i];
        }
    }
    
    return closestLevel;
}

function getNextZoomLevel(direction) {
    if (direction === 'in') {
        // Find next higher zoom level
        for (let i = 0; i < zoomLevels.length; i++) {
            if (zoomLevels[i] > yearWidth) {
                return zoomLevels[i];
            }
        }
        // If already at or past the last level, stay at max
        return maxZoomIn;
    } else {
        // Find next lower zoom level (search from end)
        for (let i = zoomLevels.length - 1; i >= 0; i--) {
            if (zoomLevels[i] < yearWidth) {
                return zoomLevels[i];
            }
        }
        // If already at or past the first level, stay at min
        return maxZoomOut;
    }
}

function zoomIn() {
    const nextLevel = getNextZoomLevel('in');
    updateZoom(nextLevel);
}

function zoomOut() {
    const nextLevel = getNextZoomLevel('out');
    updateZoom(nextLevel);
}

function zoomToMax() {
    updateZoom(maxZoomIn);
}

function zoomToMin() {
    updateZoom(maxZoomOut);
}

// Enable pinch/trackpad zooming on the timeline scroll area.
function setupWheelZoom() {
    const scrollable = getTimelineScrollable();
    // Restrict wheel/pinch zoom to the events layer so it only triggers while hovering timeline content.
    const zoomSurface = eventsLayer;
    if (!scrollable || !zoomSurface) return;

    let wheelFramePending = false;
    let pendingZoomWidth = yearWidth;
    let gestureAnchorYear = null;
    let gestureTimeout = null;

    const handleWheel = (event) => {
        // Prevent the browser page zoom and keep the gesture within the timeline.
        event.preventDefault();

        // Determine the year under the cursor so we can keep it centered while zooming.
        const rect = scrollable.getBoundingClientRect();
        const offsetX = event.clientX - rect.left + scrollable.scrollLeft;
        const anchorYear = minYear + (offsetX / yearWidth);
        if (gestureAnchorYear === null) {
            gestureAnchorYear = anchorYear;
        }

        // Smooth zoom factor based on gesture intensity; clamp to our limits.
        const zoomFactor = 1 + Math.min(Math.abs(event.deltaY) * 0.0025, 1.5);
        pendingZoomWidth = event.deltaY < 0
            ? Math.min(pendingZoomWidth * zoomFactor, maxZoomIn)
            : Math.max(pendingZoomWidth / zoomFactor, maxZoomOut);

        // Throttle via rAF so we update smoothly without over-rendering.
        if (!wheelFramePending) {
            wheelFramePending = true;
            requestAnimationFrame(() => {
                wheelFramePending = false;
                updateZoom(pendingZoomWidth, { anchor: { type: 'center', centerYear: gestureAnchorYear } });
            });
        }

        // Reset the gesture anchor after a short pause in wheel events.
        if (gestureTimeout) {
            clearTimeout(gestureTimeout);
        }
        gestureTimeout = setTimeout(() => {
            gestureAnchorYear = null;
            pendingZoomWidth = yearWidth;
        }, 180);
    };

    zoomSurface.addEventListener('wheel', handleWheel, { passive: false });
}

