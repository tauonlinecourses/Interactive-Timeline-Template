// Timeline rendering: width calculations, labels, and event blocks.

function getTimelineWidth() {
    if (minYear === null || maxYear === null) return 0;
    const yearRange = maxYear - minYear + 1;
    return yearRange * yearWidth;
}

function getTimelineScrollable() {
    return document.querySelector('.timeline-scrollable');
}

function setupTimelineDrag() {
    const scrollable = getTimelineScrollable();
    // Use the events layer as the drag surface so dragging only happens over the timeline content
    const dragSurface = eventsLayer;
    if (!scrollable || !dragSurface) return;

    const startDrag = (event) => {
        if (event.button !== 0) return;
        if (isZooming) return; // Skip drag while zoom gestures are active
        // Prevent dragging when interacting with an event block
        if (event.target.closest('.event')) return;
        timelineDragging = true;
        timelineDragStartX = event.clientX;
        timelineDragStartScrollLeft = scrollable.scrollLeft;
        scrollable.classList.add('dragging');
    };

    const handleDrag = (event) => {
        if (!timelineDragging) return;
        const deltaX = event.clientX - timelineDragStartX;
        scrollable.scrollLeft = timelineDragStartScrollLeft - deltaX;
    };

    const endDrag = () => {
        if (!timelineDragging) return;
        timelineDragging = false;
        scrollable.classList.remove('dragging');
    };

    dragSurface.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', endDrag);
    dragSurface.addEventListener('mouseleave', endDrag);
}

function setupStickyTitlesOnScroll() {
    const scrollable = getTimelineScrollable();
    if (!scrollable) return;

    // Only hide titles that change position during scroll
    let scrollTimeout = null;
    let isScrolling = false;
    let titlePositionsBeforeScroll = new Map(); // Store positions before scroll

    const storeCurrentPositions = () => {
        titlePositionsBeforeScroll.clear();
        const allEventElements = eventsLayer.querySelectorAll('.event:not(.fade-out)');
        allEventElements.forEach(eventDiv => {
            const titleEl = eventDiv.querySelector('.event-title');
            if (!titleEl) return;

            // Skip if title is already hidden or is a min-width event (fixed position)
            const isTitleHidden = eventDiv.getAttribute('data-title-hidden') === 'true';
            const isMinWidthEvent = eventDiv.getAttribute('data-min-width') === 'true';
            if (isTitleHidden || isMinWidthEvent) return;

            const eventIndex = parseInt(eventDiv.getAttribute('data-event-index'), 10);
            if (!isNaN(eventIndex)) {
                // Extract current translateX value
                const transform = titleEl.style.transform || '';
                const match = transform.match(/translateX\(([^)]+)\)/);
                const currentTranslateX = match ? parseFloat(match[1]) : 0;
                titlePositionsBeforeScroll.set(eventIndex, currentTranslateX);
            }
        });
    };

    scrollable.addEventListener('scroll', () => {
        // Store current positions when scrolling starts (only once per scroll session)
        if (!isScrolling) {
            isScrolling = true;
            storeCurrentPositions();
        }

        // Clear existing timeout
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }

        // After scrolling stops: check if positions changed, then hide/show only if needed
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            updateStickyEventTitles(true, titlePositionsBeforeScroll); // Pass stored positions for comparison
            titlePositionsBeforeScroll.clear(); // Reset for next scroll
        }, 150);
    });
}

function renderTimeline(scrollToEnd = false, centerYear = null) {
    if (minYear === null || maxYear === null) return;

    const container = document.querySelector('.timeline-container');
    const scrollable = document.querySelector('.timeline-scrollable');

    const timelineWidth = getTimelineWidth();
    
    // Ensure timeline layers extend to at least the viewport width to prevent extra space on the right
    const viewportWidth = scrollable ? scrollable.clientWidth : window.innerWidth;
    const effectiveWidth = Math.max(timelineWidth, viewportWidth);

    container.style.width = '100%';
    eventsLayer.style.width = `${effectiveWidth}px`;
    yearsLayer.style.width = `${effectiveWidth}px`;
    reflectionLayer.style.width = `${effectiveWidth}px`;

    const timelineLine = scrollable.querySelector('.timeline-line');
    if (timelineLine) {
        timelineLine.style.width = `${effectiveWidth}px`;
    }

    renderYearLabels();
    renderEvents();

    setTimeout(() => {
        if (scrollToEnd) {
            // RTL: newest events are at left (scrollLeft = 0) — no scrolling needed.
            // LTR: scroll to the right end to show newest events.
            if (!isRTL) {
                scrollable.scrollLeft = scrollable.scrollWidth - scrollable.clientWidth;
            }
        } else if (centerYear !== null) {
            const newCenterPosition = yearToLeft(centerYear);
            const targetScrollLeft = newCenterPosition - scrollable.clientWidth / 2;
            const maxScroll = scrollable.scrollWidth - scrollable.clientWidth;
            scrollable.scrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScroll));
        }
        updateStickyEventTitles();
    }, 0);
}

function renderYearLabels() {
    yearsLayer.innerHTML = '';

    if (minYear === null || maxYear === null) return;

    const yearLabelInterval = getYearLabelInterval();
    const shouldCondenseLabels = yearWidth <= condensedYearWidthThreshold || yearLabelInterval > 1;
    yearsLayer.classList.toggle('condensed-labels', shouldCondenseLabels);

    const useRoundedIntervals = yearLabelInterval >= 5;

    for (let year = minYear; year <= maxYear; year++) {
        const matchesInterval = useRoundedIntervals
            ? year % yearLabelInterval === 0 // Align to round numbers (e.g., 1910, 1920)
            : (year - minYear) % yearLabelInterval === 0;

        // At full zoom out (centuries), skip boundary years that don't match the interval.
        // For maxYear specifically, only show it when zoomed in enough (interval ≤ 2).
        const showMinYear = year === minYear && yearLabelInterval < 100;
        const showMaxYear = year === maxYear && yearLabelInterval <= 2;
        const showBoundaryYear = showMinYear || showMaxYear;
        if (!showBoundaryYear && !matchesInterval) {
            continue;
        }

        const yearLabel = document.createElement('div');
        yearLabel.className = 'year-label';
        yearLabel.textContent = year;

        const leftPosition = yearToLeft(year);
        yearLabel.style.left = `${leftPosition}px`;

        yearLabel.style.width = `${yearWidth}px`;

        yearsLayer.appendChild(yearLabel);
    }
}

function getYearLabelInterval() {
    const intervalLevel = yearLabelIntervalLevels.find(level => yearWidth <= level.maxWidth);
    return intervalLevel ? intervalLevel.interval : 1;
}

function getEventColor(event) {
    return '#464646';
}

function renderEvents() {
    if (minYear === null || maxYear === null || events.length === 0) return;

    const existingEventElements = Array.from(eventsLayer.querySelectorAll('.event'));
    const existingEventMap = new Map();
    existingEventElements.forEach(el => {
        const eventIndex = parseInt(el.getAttribute('data-event-index'), 10);
        if (!isNaN(eventIndex)) {
            existingEventMap.set(eventIndex, el);
        }
    });

    const visibleEventMap = new Map();
    events.forEach((event, index) => {
        if (isEventVisible(event)) {
            visibleEventMap.set(index, event);
        }
    });

    // Prepare entrance animation: sort events by start_year for sequential reveal
    let entranceAnimationEvents = [];
    if (shouldPlayEntranceAnimation && isInitialRender && !entranceAnimationInProgress) {
        entranceAnimationEvents = Array.from(visibleEventMap.entries())
            .sort((a, b) => a[1].start_year - b[1].start_year);
        entranceAnimationInProgress = true;
    }

    existingEventMap.forEach((eventDiv, eventIndex) => {
        if (!visibleEventMap.has(eventIndex)) {
            if (isZooming) {
                eventDiv.remove();
            } else {
                // Clear inline opacity that may have been set when canceling a previous fade-out
                eventDiv.style.opacity = '';
                eventDiv.classList.add('fade-out');
                eventDiv.addEventListener('transitionend', function handler(e) {
                    if (e.propertyName === 'opacity' && eventDiv.classList.contains('fade-out')) {
                        eventDiv.removeEventListener('transitionend', handler);
                        eventDiv.remove();
                    }
                }, { once: true });
            }
        }
    });

    const maxLayers = 8; // Maximum lanes to prevent infinite growth
    const isMobile = window.innerWidth < 768;
    const layerSpacing = isMobile ? 55 : 65;
    const eventsLayerHeight = (eventsLayer?.clientHeight || eventsLayer?.offsetHeight || 800);
    const eventHeight = 30;
    const laneOccupancy = []; // Dynamic array - lanes added as needed
    // Track events by lane with their event index for title visibility checks
    const laneEventsByIndex = []; // Array of arrays, each containing event indices in that lane

    visibleEventMap.forEach((event, eventIndex) => {
        let eventDiv = existingEventMap.get(eventIndex);
        const isNewEvent = !eventDiv;
        const eventDurationYears = event.end_year - event.start_year + 1;

        if (isNewEvent) {
            const shouldFadeIn = !isInitialRender && !isZooming;
            const shouldEntranceAnimate = shouldPlayEntranceAnimation && isInitialRender;
            eventDiv = document.createElement('div');
            eventDiv.className = 'event' + (shouldFadeIn ? ' fade-in' : '') + (shouldEntranceAnimate ? ' entrance-animation' : '');
            
            // Create the title container (positioned above the block)
            const eventTitle = document.createElement('span');
            eventTitle.className = 'event-title';

            // Add category color circles first (appears on the right in RTL)
            if (event.categories && event.categories.length > 0) {
                const categoriesContainer = document.createElement('span');
                categoriesContainer.className = 'event-title-categories';
                event.categories.forEach(category => {
                    const circle = document.createElement('span');
                    circle.className = 'event-title-category-circle';
                    const categoryColor = categoryColors[category] || defaultColor;
                    circle.style.backgroundColor = categoryColor;
                    categoriesContainer.appendChild(circle);
                });
                eventTitle.appendChild(categoriesContainer);
            }

            const titleText = document.createElement('span');
            titleText.className = 'event-title-text';
            titleText.textContent = reverseHebrewEnglishTitle(event.title);
            eventTitle.appendChild(titleText);

            // Create the visual block element (the bar on the timeline)
            const eventBlock = document.createElement('div');
            eventBlock.className = 'event-block';

            // If the event has a video, show a non-clickable video icon inside the block itself
            if (event.video_url && event.video_url.trim() !== '') {
                const videoIconWrapper = document.createElement('span');
                videoIconWrapper.className = 'video-icon';
                const videoIcon = document.createElement('img');
                videoIcon.src = 'static/icons/video-icon-white.svg';
                videoIcon.alt = 'Video';
                videoIconWrapper.appendChild(videoIcon);
                eventBlock.appendChild(videoIconWrapper);
            }

            eventDiv.appendChild(eventTitle);
            eventDiv.appendChild(eventBlock);
            eventDiv.setAttribute('data-event-index', eventIndex);

            const eventColor = getEventColor(event);
            const getCurrentEventMetrics = () => {
                const duration = event.end_year - event.start_year + 1;
                const currentWidth = duration * yearWidth;
                const currentLeft = (event.start_year - minYear) * yearWidth;
                return { currentWidth, currentLeft };
            };

            eventDiv.addEventListener('mouseenter', (e) => {
                const { currentWidth, currentLeft } = getCurrentEventMetrics();
                const reflectionWidth = Math.max(currentWidth - 10, 0);
                const reflectionLeft = isRTL
                    ? (maxYear - event.end_year) * yearWidth
                    : currentLeft;
                showReflectionBlock(event.start_year, event.end_year, eventColor, reflectionLeft, reflectionWidth);
                const followCursor = eventDurationYears >= 15;
                const laneIndex = parseInt(eventDiv.getAttribute('data-lane-index') || '0', 10);
                const placement = laneIndex >= 7 ? 'below' : 'above';
                showEventTooltip(event, eventDiv, followCursor, e, placement);
                highlightMinimapEvent(eventDiv);
            });

            eventDiv.addEventListener('mousemove', (e) => {
                updateTooltipPosition(eventDiv, e);
            });

            eventDiv.addEventListener('mouseleave', () => {
                hideReflectionBlock();
                hideEventTooltip();
                clearMinimapHighlight();
            });

            eventDiv.addEventListener('click', () => {
                showEventModal(event);
            });

            eventsLayer.appendChild(eventDiv);
            
            // Apply staggered entrance animation delay
            if (shouldPlayEntranceAnimation && isInitialRender && entranceAnimationEvents.length > 0) {
                const animationIndex = entranceAnimationEvents.findIndex(([idx]) => idx === eventIndex);
                if (animationIndex !== -1) {
                    // Calculate delay: base delay + staggered delay per event
                    const baseDelay = 200; // Initial delay before first event appears
                    const staggerDelay = 30; // Delay between each event (faster for many events)
                    const totalDelay = baseDelay + (animationIndex * staggerDelay);
                    eventDiv.style.animationDelay = `${totalDelay}ms`;
                }
            }
        } else {
            if (eventDiv.classList.contains('fade-out')) {
                eventDiv.classList.remove('fade-out');
                eventDiv.style.opacity = '1';
            }
        }

        if (isZooming) {
            eventDiv.style.transition = 'none';
        } else {
            eventDiv.style.transition = '';
        }

        const eventColor = getEventColor(event);
        const eventBlockEl = eventDiv.querySelector('.event-block');
        if (eventBlockEl) {
            eventBlockEl.style.background = eventColor;
        }

        const eventWidth = eventDurationYears * yearWidth;
        const adjustedWidth = Math.max(eventWidth - 10, 0);
        eventDiv.style.width = `${adjustedWidth}px`;

        // Check if this is a minimum width event
        // An event is a minwidth event if its adjusted width is at or below the threshold
        const isMinWidthEvent = adjustedWidth <= 45;
        if (isMinWidthEvent) {
            eventDiv.setAttribute('data-min-width', 'true');
        } else {
            eventDiv.removeAttribute('data-min-width');
        }



        // For minimum width events, set title to align right (fixed position)
        // Use requestAnimationFrame to ensure accurate measurement after DOM update
        if (isMinWidthEvent) {
            const titleEl = eventDiv.querySelector('.event-title');
            if (titleEl) {

            }
        }

        const leftPosition = isRTL
            ? (maxYear - event.end_year) * yearWidth
            : (event.start_year - minYear) * yearWidth;
        eventDiv.style.left = `${leftPosition}px`;

        // Set z-index so left events appear above right events (regardless of which are newer/older)
        const baseZIndex = 1;
        const zIndex = isRTL
            ? (event.start_year - minYear) + baseZIndex  // RTL: newer (left) events get higher z-index
            : (maxYear - event.start_year) + baseZIndex; // LTR: older (left) events get higher z-index
        eventDiv.style.zIndex = zIndex;

        // Minimum gap between events on the same lane (in pixels)
        // Use larger gap on mobile for better touch interaction
        const minEventGapPx = isMobile ? 50 : 35;
        // Convert pixel gap to year-equivalent buffer
        const gapInYears = minEventGapPx / yearWidth;

        // Find an available lane or create a new one
        let laneIndex = 0;
        let foundLane = false;
        for (; laneIndex < laneOccupancy.length; laneIndex++) {
            const laneEvents = laneOccupancy[laneIndex];
            const hasOverlap = laneEvents.some(range => (
                event.start_year <= (range.end + gapInYears) && event.end_year >= (range.start - gapInYears)
            ));
            if (!hasOverlap) {
                foundLane = true;
                break;
            }
        }

        // If no available lane found, create a new one (up to maxLayers)
        if (!foundLane) {
            if (laneOccupancy.length < maxLayers) {
                laneIndex = laneOccupancy.length;
                laneOccupancy.push([]);
            } else {
                // Fall back to last lane if max reached
                laneIndex = maxLayers - 1;
            }
        }

        // Ensure the lane exists in the array
        if (!laneOccupancy[laneIndex]) {
            laneOccupancy[laneIndex] = [];
        }
        if (!laneEventsByIndex[laneIndex]) {
            laneEventsByIndex[laneIndex] = [];
        }

        laneOccupancy[laneIndex].push({
            start: event.start_year,
            end: event.end_year
        });
        laneEventsByIndex[laneIndex].push(eventIndex);

        eventDiv.setAttribute('data-lane-index', laneIndex);
        eventDiv.setAttribute('data-start-year', event.start_year);
        eventDiv.setAttribute('data-end-year', event.end_year);
        eventDiv.setAttribute('data-background', eventColor);

        if (isNewEvent && !isInitialRender && !isZooming) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    eventDiv.classList.remove('fade-in');
                });
            });
        } else if (isNewEvent && isZooming) {
            eventDiv.classList.remove('fade-in');
            eventDiv.style.opacity = '1';
        }
    });

    // Post-process top layer events to space them when they overlap.
    // Events end up on the top layer when all other lanes are full, so they may
    // overlap.  Spread them from right to left with a minimum pixel gap.
    const topLayerIndex = maxLayers - 1;
    
    if (laneEventsByIndex[topLayerIndex] && laneEventsByIndex[topLayerIndex].length > 1) {
        // Use larger gap on mobile for better touch interaction
        const isMobileForTopLayer = window.innerWidth < 768;
        const topLayerMinGapPx = isMobileForTopLayer ? 75 : 50;
        
        // Collect all top layer events with their info
        const topLayerEvents = laneEventsByIndex[topLayerIndex].map(eventIndex => {
            const event = visibleEventMap.get(eventIndex);
            const eventDiv = eventsLayer.querySelector(`.event[data-event-index="${eventIndex}"]`);
            const eventDurationYears = event.end_year - event.start_year + 1;
            const eventWidthPx = Math.max(eventDurationYears * yearWidth - 10, 0);
            const naturalLeftPx = isRTL
                ? (maxYear - event.end_year) * yearWidth
                : (event.start_year - minYear) * yearWidth;
            return { eventIndex, event, eventDiv, eventWidthPx, naturalLeftPx };
        });

        if (isRTL) {
            // RTL: keep leftmost (newest) in place, shift older events rightward as needed
            topLayerEvents.sort((a, b) => b.event.end_year - a.event.end_year);

            let rightmostAllowedLeft = null;
            for (const item of topLayerEvents) {
                const { eventDiv, eventWidthPx, naturalLeftPx } = item;

                if (rightmostAllowedLeft === null) {
                    // First (leftmost/newest) event stays in place
                    rightmostAllowedLeft = naturalLeftPx + eventWidthPx + topLayerMinGapPx;
                } else {
                    if (naturalLeftPx < rightmostAllowedLeft) {
                        // Shift this event rightward to clear the previous one
                        const newLeftPx = rightmostAllowedLeft;
                        eventDiv.style.left = `${newLeftPx}px`;
                        rightmostAllowedLeft = newLeftPx + eventWidthPx + topLayerMinGapPx;
                    } else {
                        rightmostAllowedLeft = naturalLeftPx + eventWidthPx + topLayerMinGapPx;
                    }
                }
            }
        } else {
            // LTR: keep rightmost (newest) in place, shift older events leftward as needed
            topLayerEvents.sort((a, b) => b.event.start_year - a.event.start_year);

            let leftmostAllowedRight = null;
            for (const item of topLayerEvents) {
                const { eventDiv, eventWidthPx, naturalLeftPx } = item;

                if (leftmostAllowedRight === null) {
                    // First (rightmost) event stays in place
                    leftmostAllowedRight = naturalLeftPx - topLayerMinGapPx;
                } else {
                    const naturalRightPx = naturalLeftPx + eventWidthPx;
                    if (naturalRightPx > leftmostAllowedRight) {
                        const newLeftPx = Math.max(0, leftmostAllowedRight - eventWidthPx);
                        eventDiv.style.left = `${newLeftPx}px`;
                        leftmostAllowedRight = newLeftPx - topLayerMinGapPx;
                    } else {
                        leftmostAllowedRight = naturalLeftPx - topLayerMinGapPx;
                    }
                }
            }
        }
    }

    activeLayersCount = laneOccupancy.filter(lane => lane && lane.length > 0).length;

    // Check title visibility: hide titles for narrow events that have nearby events in the same lane
    const minTitleWidth = 145; // Minimum width in pixels to show title
    const nearbyYearsThreshold = 6; // Check for events within previous 5 years
    
    // Query all event elements from DOM (includes both existing and newly created events)
    const allEventDivs = eventsLayer.querySelectorAll('.event:not(.fade-out)');
    const eventDivMap = new Map();
    allEventDivs.forEach(eventDiv => {
        const eventIndex = parseInt(eventDiv.getAttribute('data-event-index'), 10);
        if (!isNaN(eventIndex)) {
            eventDivMap.set(eventIndex, eventDiv);
        }
    });
    
    // Check if we're at full zoom out (centuries view)
    const isFullZoomOut = yearWidth <= 8;
    
    visibleEventMap.forEach((event, eventIndex) => {
        const eventDiv = eventDivMap.get(eventIndex);
        if (!eventDiv) return;

        const eventDurationYears = event.end_year - event.start_year + 1;
        const eventWidth = eventDurationYears * yearWidth;
        const adjustedWidth = Math.max(eventWidth - 10, 0);
        
        // At full zoom out, hide title if there's an event within 100px in the direction the title extends
        if (isFullZoomOut) {
            const laneIndex = parseInt(eventDiv.getAttribute('data-lane-index'), 10);
            const thisLeftPx = parseFloat(eventDiv.style.left) || 0;
            const maxGapPxForTitle = 100;

            if (!isNaN(laneIndex) && laneEventsByIndex[laneIndex]) {
                const hasCloseEventBefore = laneEventsByIndex[laneIndex].some(otherEventIndex => {
                    if (otherEventIndex === eventIndex) return false; // Skip self
                    const otherEventDiv = eventDivMap.get(otherEventIndex);
                    if (!otherEventDiv) return false;

                    const otherLeftPx = parseFloat(otherEventDiv.style.left) || 0;
                    const otherWidthPx = parseFloat(otherEventDiv.style.width) || 0;
                    const otherRightPx = otherLeftPx + otherWidthPx;

                    // Title extends leftward from right edge (both LTR and RTL); hide if there's a close event to the LEFT
                    if (otherRightPx <= thisLeftPx) {
                        const gapPx = thisLeftPx - otherRightPx;
                        return gapPx <= maxGapPxForTitle;
                    }
                    return false;
                });
                
                if (hasCloseEventBefore && adjustedWidth < minTitleWidth) {
                    const titleEl = eventDiv.querySelector('.event-title');
                    if (titleEl) {
                        titleEl.style.display = 'none';
                        eventDiv.setAttribute('data-title-hidden', 'true');
                    }
                    return; // Skip further title visibility checks
                }
            }
        }
        
        // Check if event width is below threshold
        if (adjustedWidth < minTitleWidth) {
            const laneIndex = parseInt(eventDiv.getAttribute('data-lane-index'), 10);
            if (!isNaN(laneIndex) && laneEventsByIndex[laneIndex]) {
                // Check if there's another event in the same lane within previous years
                // Calculate gap from current event's first year to previous event's last year
                const hasNearbyEvent = laneEventsByIndex[laneIndex].some(otherEventIndex => {
                    if (otherEventIndex === eventIndex) return false; // Skip self
                    const otherEvent = visibleEventMap.get(otherEventIndex);
                    if (!otherEvent) return false;
                    if (isRTL) {
                        // RTL: title extends leftward (into newer events to the LEFT); check nearby newer events
                        if (otherEvent.start_year <= event.end_year) return false;
                        const yearGap = otherEvent.start_year - event.end_year;
                        return yearGap > 0 && yearGap <= nearbyYearsThreshold;
                    } else {
                        // LTR: title extends leftward (into older events to the LEFT); check nearby older events
                        if (otherEvent.end_year >= event.start_year) return false;
                        const yearGap = event.start_year - otherEvent.end_year;
                        return yearGap > 0 && yearGap <= nearbyYearsThreshold;
                    }
                });

                // Hide title if there's a nearby event in the same lane
                const titleEl = eventDiv.querySelector('.event-title');
                if (titleEl) {
                    if (hasNearbyEvent) {
                        titleEl.style.display = 'none';
                        eventDiv.setAttribute('data-title-hidden', 'true');
                    } else {
                        titleEl.style.display = '';
                        eventDiv.removeAttribute('data-title-hidden');
                    }
                }
            }
        } else {
            // Event is wide enough, ensure title is visible
            const titleEl = eventDiv.querySelector('.event-title');
            if (titleEl) {
                titleEl.style.display = '';
                eventDiv.removeAttribute('data-title-hidden');
            }
        }
    });

    // Title truncation: limit title width so it does not overlap the adjacent event in the same lane.
    // (Uses final positions including top-layer repositioning; .event-title-text uses CSS ellipsis)
    // In LTR: title extends right, limit by nearest older event to the LEFT.
    // In RTL: title extends right from the event's left edge, limit by nearest older event to the RIGHT.
    const titlePaddingLeft = 15; // Match .event-title padding in events.css (padding-left in LTR, padding-right in RTL)
    const titleSafetyBuffer = 10; // Minimum gap before adjacent event
    const defaultTitleMaxWidth = 500; // Match .event-title max-width in events.css
    visibleEventMap.forEach((event, eventIndex) => {
        const eventDiv = eventDivMap.get(eventIndex);
        if (!eventDiv) return;
        if (eventDiv.getAttribute('data-title-hidden') === 'true') return;

        const laneIndex = parseInt(eventDiv.getAttribute('data-lane-index'), 10);
        const eventLeftPx = parseFloat(eventDiv.style.left) || 0;
        const eventWidthPx = parseFloat(eventDiv.style.width) || 0;

        const titleEl = eventDiv.querySelector('.event-title');
        const titleTextEl = eventDiv.querySelector('.event-title-text');
        if (!titleEl || !titleTextEl) return;

        if (isRTL) {
            // RTL: title aligns to the RIGHT edge of the event and extends leftward.
            // Limit width so it doesn't overlap the nearest NEWER event to the LEFT.
            let nearestNewerEventRightPx = 0;
            if (!isNaN(laneIndex) && laneEventsByIndex[laneIndex]) {
                laneEventsByIndex[laneIndex].forEach(otherEventIndex => {
                    if (otherEventIndex === eventIndex) return;
                    const otherEvent = visibleEventMap.get(otherEventIndex);
                    const otherEventDiv = eventDivMap.get(otherEventIndex);
                    if (!otherEvent || !otherEventDiv) return;
                    // Only consider newer events (that start after current event ends)
                    if (otherEvent.start_year <= event.end_year) return;
                    const otherLeftPx = parseFloat(otherEventDiv.style.left) || 0;
                    const otherWidthPx = parseFloat(otherEventDiv.style.width) || 0;
                    const otherRightPx = otherLeftPx + otherWidthPx;
                    // Newer events appear to the LEFT (smaller left value) in RTL
                    if (otherLeftPx < eventLeftPx) {
                        nearestNewerEventRightPx = Math.max(nearestNewerEventRightPx, otherRightPx);
                    }
                });
            }
            const eventRightPx = eventLeftPx + eventWidthPx;
            const availableWidth = eventRightPx - nearestNewerEventRightPx - titlePaddingLeft - titleSafetyBuffer;
            if (nearestNewerEventRightPx > 0 && availableWidth < defaultTitleMaxWidth) {
                titleTextEl.style.maxWidth = `${Math.max(0, Math.floor(availableWidth))}px`;
            } else {
                titleTextEl.style.maxWidth = '';
            }
        } else {
            // LTR: title aligns to the RIGHT edge of the event. Limit by nearest older event to the LEFT.
            let previousEventRightPx = 0;
            if (!isNaN(laneIndex) && laneEventsByIndex[laneIndex]) {
                laneEventsByIndex[laneIndex].forEach(otherEventIndex => {
                    if (otherEventIndex === eventIndex) return;
                    const otherEvent = visibleEventMap.get(otherEventIndex);
                    const otherEventDiv = eventDivMap.get(otherEventIndex);
                    if (!otherEvent || !otherEventDiv) return;
                    if (otherEvent.end_year >= event.start_year) return;
                    const otherLeftPx = parseFloat(otherEventDiv.style.left) || 0;
                    const otherWidthPx = parseFloat(otherEventDiv.style.width) || 0;
                    const otherRightPx = otherLeftPx + otherWidthPx;
                    previousEventRightPx = Math.max(previousEventRightPx, otherRightPx);
                });
            }
            const availableWidth = (eventLeftPx + eventWidthPx) - previousEventRightPx - titlePaddingLeft - titleSafetyBuffer;
            if (previousEventRightPx > 0 && availableWidth < defaultTitleMaxWidth) {
                titleTextEl.style.maxWidth = `${Math.max(0, Math.floor(availableWidth))}px`;
            } else {
                titleTextEl.style.maxWidth = '';
            }
        }
    });

    // Calculate push-up offset; use a fixed baseline so the timeline line
    // sits at the same vertical position for all timelines (match layout
    // of the default/global timeline when it uses 8 layers).
    const baselineLayers = 9;
    const unusedLayers = Math.max(0, baselineLayers - activeLayersCount);
    const maxPushUpOffset = 160;
    const calculatedPushUp = Math.min(unusedLayers * layerSpacing, maxPushUpOffset);

    // Baseline: assume 8 active layers on desktop, which corresponds to a
    // single unused layer. This produces a constant vertical offset that
    // matches the original global timeline layout.
    const baselineActiveLayers = 8;
    const baselineUnusedLayers = Math.max(0, baselineLayers - baselineActiveLayers);
    const baselinePushUpOffset = Math.min(baselineUnusedLayers * layerSpacing, maxPushUpOffset);

    if (fixedPushUpOffset === null) {
        fixedPushUpOffset = baselinePushUpOffset;
    }
    const pushUpOffset = fixedPushUpOffset;

    const allEventElements = eventsLayer.querySelectorAll('.event:not(.fade-out)');
    allEventElements.forEach(eventDiv => {
        if (isZooming) {
            eventDiv.style.transition = 'none';
        }

        const laneIndex = parseInt(eventDiv.getAttribute('data-lane-index'), 10);
        if (!isNaN(laneIndex)) {
            const verticalOffset = laneIndex * layerSpacing;
            const topPosition = eventsLayerHeight - eventHeight - verticalOffset - pushUpOffset;
            eventDiv.style.top = `${topPosition}px`;
        }

        if (!isZooming) {
            eventDiv.style.transition = '';
        }
    });

    const scrollable = document.querySelector('.timeline-scrollable');
    const timelineLine = scrollable.querySelector('.timeline-line');
    const timelineBottomBar = document.querySelector('.timeline-bottom-bar');

    const timelineArrowRight = document.querySelector('.timeline-arrow-right');

    // Check if we're on mobile - skip JS positioning and let CSS handle it
    if (!isMobile) {
        // Desktop only: dynamically position timeline elements based on active layers
        const baseTimelineLineTop = 780;
        const baseReflectionLayerTop = 786;
        const baseYearsLayerTop = 790;

        if (timelineLine) {
            timelineLine.style.top = `${baseTimelineLineTop - pushUpOffset}px`;
        }

        if (timelineArrowRight) {
            // Center on the timeline line: line top + half of line height (3px)
            timelineArrowRight.style.top = `${baseTimelineLineTop - pushUpOffset + 3}px`;
        }

        if (reflectionLayer) {
            reflectionLayer.style.top = `${baseReflectionLayerTop - pushUpOffset}px`;
        }

        if (yearsLayer) {
            yearsLayer.style.top = `${baseYearsLayerTop - pushUpOffset}px`;
        }
    } else {
        // Mobile: clear any inline styles so CSS media queries take effect
        if (timelineLine) {
            timelineLine.style.top = '';
        }
        if (timelineArrowRight) {
            timelineArrowRight.style.top = '';
        }
        if (reflectionLayer) {
            reflectionLayer.style.top = '';
        }
        if (yearsLayer) {
            yearsLayer.style.top = '';
        }
    }

    if (timelineBottomBar) {
        // Keep the bottom bar pinned to the viewport instead of shifting with content
        timelineBottomBar.style.bottom = '';
    }

    refreshMinimap({ redraw: true });

    // Mark entrance animation as played after all events have animated
    if (shouldPlayEntranceAnimation && isInitialRender && entranceAnimationInProgress) {
        const totalAnimationTime = 200 + (entranceAnimationEvents.length * 30) + 600; // base + stagger + animation duration
        setTimeout(() => {
            shouldPlayEntranceAnimation = false;
            entranceAnimationInProgress = false;
            
            // Remove animation class from all events
            const allEvents = eventsLayer.querySelectorAll('.event.entrance-animation');
            allEvents.forEach(el => {
                el.classList.remove('entrance-animation');
                el.style.animationDelay = '';
            });
            
            // Update sticky title positions first (while titles are still hidden)
            updateStickyEventTitles();
            
            // Now reveal all titles with a smooth fade-in
            requestAnimationFrame(() => {
                const allTitles = eventsLayer.querySelectorAll('.event .event-title');
                allTitles.forEach((titleEl, index) => {
                    titleEl.style.visibility = 'visible';
                    titleEl.style.transition = 'opacity 0.4s ease-out';
                    titleEl.style.opacity = '0';
                    // Stagger the title fade-ins slightly
                    setTimeout(() => {
                        titleEl.style.opacity = '1';
                        // Clean up inline styles after animation
                        setTimeout(() => {
                            titleEl.style.transition = '';
                        }, 400);
                    }, index * 15);
                });
            });
        }, totalAnimationTime);
    }
}

function updateStickyEventTitles(animateAfterScroll = false, previousPositions = null) {
    const scrollable = getTimelineScrollable();
    if (!scrollable) return;

    const viewLeft = scrollable.scrollLeft;
    const viewRight = viewLeft + scrollable.clientWidth;
    const viewCenter = viewLeft + scrollable.clientWidth / 2;
    const padding = 10; // Padding from viewport edges

    const allEventElements = eventsLayer.querySelectorAll('.event:not(.fade-out)');
    const titlesToAnimate = []; // Titles that changed position and need fade out/in
    
    allEventElements.forEach(eventDiv => {
        const titleEl = eventDiv.querySelector('.event-title');
        if (!titleEl) return;

        // Skip updating if title is hidden
        const isTitleHidden = eventDiv.getAttribute('data-title-hidden') === 'true';
        if (isTitleHidden) return;

        // Check if this is a min-width event (they get position updates but no animation)
        const isMinWidthEvent = eventDiv.getAttribute('data-min-width') === 'true';

        // Get event position and width from inline styles
        const eventLeft = parseFloat(eventDiv.style.left) || 0;
        const inlineWidth = parseFloat(eventDiv.style.width) || 0;
        let eventWidth = inlineWidth;

        // For min-width events, use the actual rendered width of the event-block (which has min-width: 35px in CSS)
        // This ensures title aligns with the visual right edge, not the styled width which may be tiny
        if (isMinWidthEvent) {
            const eventBlockEl = eventDiv.querySelector('.event-block');
            if (eventBlockEl) {
                eventWidth = eventBlockEl.offsetWidth;
            }
        }

        const eventRight = eventLeft + eventWidth;
        // The .event-title has `right: 0` relative to the .event div, so its CSS-natural right edge
        // aligns with the .event div's inline width — not the rendered block width.
        const cssAnchorRight = eventLeft + inlineWidth;

        // Measure title width (need to temporarily reset transform to get accurate measurement)
        const currentTransform = titleEl.style.transform;
        titleEl.style.transform = '';
        const titleWidth = titleEl.offsetWidth;
        titleEl.style.transform = currentTransform;

        // Calculate desired title position.
        // Default: align to the visual right edge of the event block.
        let desiredTitleX = eventRight - titleWidth;

        // If the default position would be outside the viewport, prefer center of viewport
        if (desiredTitleX > viewRight - padding - titleWidth || desiredTitleX < viewLeft + padding) {
            // Prefer viewport center
            desiredTitleX = viewCenter - titleWidth / 2;
        }

        // Clamp to viewport bounds
        desiredTitleX = Math.max(desiredTitleX, viewLeft + padding);
        desiredTitleX = Math.min(desiredTitleX, viewRight - padding - titleWidth);

        // Clamp within event span (keep within event boundaries)
        desiredTitleX = Math.max(desiredTitleX, eventLeft);
        desiredTitleX = Math.min(desiredTitleX, eventRight - titleWidth);

        // Apply transform relative to title's CSS natural position.
        // For min-width events the .event div's inline width is smaller than the rendered block,
        // so we must offset from cssAnchorRight (inline width) rather than eventRight (block width).
        const translateX = desiredTitleX - (cssAnchorRight - titleWidth);
        
        // Min-width events: update position normally without animation
        if (isMinWidthEvent) {
            titleEl.style.transform = `translateX(${translateX}px)`;
            return; // Skip animation logic for min-width events
        }
        
        // Check if position changed (only if we have previous positions and this is after scroll)
        let positionChanged = false;
        if (animateAfterScroll && previousPositions) {
            const eventIndex = parseInt(eventDiv.getAttribute('data-event-index'), 10);
            if (!isNaN(eventIndex) && previousPositions.has(eventIndex)) {
                const previousTranslateX = previousPositions.get(eventIndex);
                // Compare with small threshold to account for floating point precision
                positionChanged = Math.abs(translateX - previousTranslateX) > 0.5;
            } else {
                // New event or no previous position, consider it as changed
                positionChanged = true;
            }
        }

        // If position changed, mark for animation
        if (animateAfterScroll && positionChanged) {
            titlesToAnimate.push({ eventDiv, titleEl, translateX });
        } else {
            // Position didn't change, update normally without animation
            titleEl.style.transform = `translateX(${translateX}px)`;
        }
    });

    // Handle fade out/in for titles that changed position
    if (animateAfterScroll && titlesToAnimate.length > 0) {
        // First, fade out titles that changed position
        titlesToAnimate.forEach(({ titleEl }) => {
            titleEl.style.transition = 'opacity 0.2s ease-out, transform 0s';
            titleEl.style.opacity = '0';
        });

        // Wait for fade-out to complete, then update positions and fade in
        setTimeout(() => {
            titlesToAnimate.forEach(({ titleEl, translateX }) => {
                // Update position while hidden
                titleEl.style.transform = `translateX(${translateX}px)`;
                // Re-enable opacity transition for smooth fade-in (no transform transition)
                titleEl.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0s';
                // Fade in to new position
                requestAnimationFrame(() => {
                    titleEl.style.opacity = '1';
                });
                // Restore normal transition after animation completes
                setTimeout(() => {
                    titleEl.style.transition = '';
                }, 400);
            });
        }, 200); // Wait for fade-out animation (200ms)
    }
}

