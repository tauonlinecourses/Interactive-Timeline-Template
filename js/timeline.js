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
            scrollable.scrollLeft = scrollable.scrollWidth - scrollable.clientWidth;
        } else if (centerYear !== null) {
            const newCenterPosition = (centerYear - minYear) * yearWidth;
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
        const isBoundaryYear = year === minYear || year === maxYear;
        const matchesInterval = useRoundedIntervals
            ? year % yearLabelInterval === 0 // Align to round numbers (e.g., 1910, 1920)
            : (year - minYear) % yearLabelInterval === 0;

        if (!isBoundaryYear && !matchesInterval) {
            continue;
        }

        const yearLabel = document.createElement('div');
        yearLabel.className = 'year-label';
        yearLabel.textContent = year;

        const leftPosition = (year - minYear) * yearWidth;
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
    const layerSpacing = 75;
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
            eventDiv = document.createElement('div');
            eventDiv.className = 'event' + (shouldFadeIn ? ' fade-in' : '');
            
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

            if (event.video_url && event.video_url.trim() !== '') {
                const videoLink = document.createElement('a');
                videoLink.className = 'video-icon';
                videoLink.href = event.video_url;
                videoLink.target = '_blank';
                videoLink.rel = 'noopener noreferrer';
                videoLink.setAttribute('aria-label', `Watch video about ${event.title}`);
                const videoIcon = document.createElement('img');
                videoIcon.src = 'static/icons/video-icon-black.svg';
                videoIcon.alt = 'Video';
                videoLink.appendChild(videoIcon);
                eventTitle.appendChild(videoLink);
            }

            // Create the visual block element
            const eventBlock = document.createElement('div');
            eventBlock.className = 'event-block';

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
                showReflectionBlock(event.start_year, event.end_year, eventColor, currentLeft, reflectionWidth);
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

            eventDiv.addEventListener('click', (e) => {
                if (e.target.closest('.video-icon')) {
                    return;
                }
                showEventModal(event);
            });

            eventsLayer.appendChild(eventDiv);
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

        const leftPosition = (event.start_year - minYear) * yearWidth;
        eventDiv.style.left = `${leftPosition}px`;

        // Set z-index so older events (further left) appear above newer events (further right)
        // Older events get higher z-index values
        const baseZIndex = 1;
        const zIndex = (maxYear - event.start_year) + baseZIndex;
        eventDiv.style.zIndex = zIndex;

        // Minimum gap between events on the same lane (in pixels)
        const minEventGapPx = 35;
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
    
    visibleEventMap.forEach((event, eventIndex) => {
        const eventDiv = eventDivMap.get(eventIndex);
        if (!eventDiv) return;

        const eventDurationYears = event.end_year - event.start_year + 1;
        const eventWidth = eventDurationYears * yearWidth;
        const adjustedWidth = Math.max(eventWidth - 10, 0);
        
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
                    // Only check events that end before the current event starts (previous events)
                    if (otherEvent.end_year >= event.start_year) return false;
                    // Calculate gap: current event's first year - previous event's last year
                    const yearGap = event.start_year - otherEvent.end_year;
                    return yearGap > 0 && yearGap <= nearbyYearsThreshold;
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

    // Calculate push-up offset based on used lanes vs a baseline
    const baselineLayers = 9;
    const unusedLayers = Math.max(0, baselineLayers - activeLayersCount);
    const maxPushUpOffset = 160;
    const pushUpOffset = Math.min(unusedLayers * layerSpacing, maxPushUpOffset);

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

    const baseTimelineLineTop = 780;
    const baseReflectionLayerTop = 786;
    const baseYearsLayerTop = 790;

    if (timelineLine) {
        timelineLine.style.top = `${baseTimelineLineTop - pushUpOffset}px`;
    }

    if (reflectionLayer) {
        reflectionLayer.style.top = `${baseReflectionLayerTop - pushUpOffset}px`;
    }

    if (yearsLayer) {
        yearsLayer.style.top = `${baseYearsLayerTop - pushUpOffset}px`;
    }

    if (timelineBottomBar) {
        // Keep the bottom bar pinned to the viewport instead of shifting with content
        timelineBottomBar.style.bottom = '';
    }

    refreshMinimap({ redraw: true });
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
        const eventWidth = parseFloat(eventDiv.style.width) || 0;
        const eventRight = eventLeft + eventWidth;

        // Measure title width (need to temporarily reset transform to get accurate measurement)
        const currentTransform = titleEl.style.transform;
        titleEl.style.transform = '';
        const titleWidth = titleEl.offsetWidth;
        titleEl.style.transform = currentTransform;

        // Calculate desired title position
        // Default: align to the right edge of the event block
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

        // Apply transform relative to event's left position
        const translateX = desiredTitleX - eventLeft;
        
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

