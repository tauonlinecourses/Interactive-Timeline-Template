// Zoom controls for adjusting year width.

const maxZoomIn = 200;
let maxZoomOut = 3.57;

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
        // Find next lower zoom level (search from end), but never below maxZoomOut
        for (let i = zoomLevels.length - 1; i >= 0; i--) {
            if (zoomLevels[i] < yearWidth && zoomLevels[i] >= maxZoomOut) {
                return zoomLevels[i];
            }
        }
        // If no valid lower level found, stay at maxZoomOut
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

// Enable two-finger pinch-to-zoom on touch devices (mobile/tablet).
function setupTouchZoom() {
    const scrollable = getTimelineScrollable();
    if (!scrollable) return;

    // Use the scrollable element as the touch surface for better mobile coverage
    const zoomSurface = scrollable;

    let initialPinchDistance = null;
    let initialYearWidth = null;
    let initialScrollLeft = null;
    let pinchAnchorYear = null;
    let pinchCenterX = null;
    let touchFramePending = false;
    let pendingZoomWidth = yearWidth;
    let isPinching = false;

    // Calculate distance between two touch points
    const getTouchDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    // Get the center point between two touches
    const getTouchCenter = (touches) => {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    };

    const handleTouchStart = (event) => {
        if (event.touches.length === 2) {
            // Two fingers detected - start pinch gesture
            isPinching = true;
            initialPinchDistance = getTouchDistance(event.touches);
            initialYearWidth = yearWidth;
            initialScrollLeft = scrollable.scrollLeft;
            pendingZoomWidth = yearWidth;

            // Calculate anchor year at the center of the pinch
            const center = getTouchCenter(event.touches);
            pinchCenterX = center.x;
            const rect = scrollable.getBoundingClientRect();
            const offsetX = center.x - rect.left + scrollable.scrollLeft;
            pinchAnchorYear = minYear + (offsetX / yearWidth);

            // Prevent default to stop browser pinch-zoom
            event.preventDefault();
        }
    };

    const handleTouchMove = (event) => {
        // Check if we should start pinching (second finger added during move)
        if (!isPinching && event.touches.length === 2) {
            isPinching = true;
            initialPinchDistance = getTouchDistance(event.touches);
            initialYearWidth = yearWidth;
            initialScrollLeft = scrollable.scrollLeft;
            pendingZoomWidth = yearWidth;

            const center = getTouchCenter(event.touches);
            pinchCenterX = center.x;
            const rect = scrollable.getBoundingClientRect();
            const offsetX = center.x - rect.left + scrollable.scrollLeft;
            pinchAnchorYear = minYear + (offsetX / yearWidth);
        }

        if (!isPinching || event.touches.length !== 2) return;

        // Prevent default browser behavior (page zoom, scroll)
        event.preventDefault();

        const currentDistance = getTouchDistance(event.touches);
        const scale = currentDistance / initialPinchDistance;

        // Calculate new zoom width based on scale
        // Pinch out (spread fingers) = zoom in, pinch in = zoom out
        const newZoomWidth = Math.min(
            Math.max(initialYearWidth * scale, maxZoomOut),
            maxZoomIn
        );

        pendingZoomWidth = newZoomWidth;

        // Throttle updates via requestAnimationFrame
        if (!touchFramePending) {
            touchFramePending = true;
            requestAnimationFrame(() => {
                touchFramePending = false;
                updateZoom(pendingZoomWidth, { anchor: { type: 'center', centerYear: pinchAnchorYear } });
            });
        }
    };

    const handleTouchEnd = (event) => {
        if (event.touches.length < 2) {
            // Pinch gesture ended
            isPinching = false;
            initialPinchDistance = null;
            initialYearWidth = null;
            initialScrollLeft = null;
            pinchAnchorYear = null;
            pinchCenterX = null;
        }
    };

    // Add touch event listeners with passive: false to allow preventDefault
    zoomSurface.addEventListener('touchstart', handleTouchStart, { passive: false });
    zoomSurface.addEventListener('touchmove', handleTouchMove, { passive: false });
    zoomSurface.addEventListener('touchend', handleTouchEnd, { passive: true });
    zoomSurface.addEventListener('touchcancel', handleTouchEnd, { passive: true });
}

