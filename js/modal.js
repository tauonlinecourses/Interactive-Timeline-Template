// Modal interactions for viewing event details.

let currentEventIndex = -1;

// Hero image scroll position (percent). Used for mouse-wheel panning when image is cover/cropped.
let heroScrollPosition = { x: 50, y: 50 };

// ==================== INFO MODAL FUNCTIONS ====================

function showInfoModal() {
    const modal = document.getElementById('infoModal');
    
    // Ensure content is populated (in case it wasn't loaded yet)
    if (typeof populateInfoModal === 'function') {
        populateInfoModal();
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function initInfoModal() {
    const infoBtn = document.getElementById('infoBtn');
    const infoModalCloseBtn = document.getElementById('infoModalCloseBtn');
    const infoModal = document.getElementById('infoModal');
    
    if (infoBtn) {
        infoBtn.addEventListener('click', showInfoModal);
    }
    
    if (infoModalCloseBtn) {
        infoModalCloseBtn.addEventListener('click', closeInfoModal);
    }
    
    if (infoModal) {
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) {
                closeInfoModal();
            }
        });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && infoModal && infoModal.classList.contains('active')) {
            closeInfoModal();
        }
    });
}

// Initialize info modal when DOM is ready
document.addEventListener('DOMContentLoaded', initInfoModal);

// ==============================================================

function extractYouTubeId(url) {
    if (!url || typeof url !== 'string') return null;

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) return null;

    let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (match && match[1]) {
        return match[1];
    }

    return null;
}

function isYouTubeLink(url) {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

// Convert URLs/emails inside a text string into clickable links within a container element
function linkifyText(container, text) {
    if (!container) return;
    container.innerHTML = '';

    if (!text || typeof text !== 'string') {
        container.textContent = text || '';
        return;
    }

    // Match only URLs starting with http(s) or www. (no generic "@" email patterns etc.)
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
        const matchText = match[0];

        // Add text before the match
        if (match.index > lastIndex) {
            container.appendChild(
                document.createTextNode(text.slice(lastIndex, match.index))
            );
        }

        // Create link for the match
        const link = document.createElement('a');
        let href = matchText;

        // Add protocol for www. links that don't have one
        if (!matchText.startsWith('http')) {
            href = `https://${matchText}`;
        }

        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = matchText;

        container.appendChild(link);
        lastIndex = urlRegex.lastIndex;
    }

    // Remaining text after last match
    if (lastIndex < text.length) {
        container.appendChild(
            document.createTextNode(text.slice(lastIndex))
        );
    }
}

function updateEventURL(eventIndex, options = {}) {
    const { replace = false } = options;
    const urlParams = new URLSearchParams(window.location.search);

    if (Number.isInteger(eventIndex) && eventIndex >= 0) {
        urlParams.set('event', eventIndex);
    } else {
        urlParams.delete('event');
    }

    const newURL = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    if (replace) {
        window.history.replaceState({}, '', newURL);
    } else {
        window.history.pushState({}, '', newURL);
    }
}

function showEventModal(event, options = {}) {
    const { skipHistoryUpdate = false } = options;
    currentEventIndex = events.findIndex(e => e === event);

    updateNavigationButtons();
    const modal = document.getElementById('eventModal');
    const modalContent = modal.querySelector('.modal-content');
    const modalHero = document.getElementById('modalHero');
    const modalHeroExpandBtn = document.getElementById('modalHeroExpandBtn');

    // Reset expanded state when opening a new event
    modalContent.classList.remove('hero-expanded');
    clearExpandedHeroDimensions(modalContent);
    if (typeof updateModalHeroExpandButtonIcon === 'function') {
        updateModalHeroExpandButtonIcon(modalContent);
    }
    const modalTitle = document.getElementById('modalTitle');
    const modalVideoIcon = document.getElementById('modalVideoIcon-black');
    const modalCategories = document.getElementById('modalCategories');
    const modalYears = document.getElementById('modalYears');
    const modalVideos = document.getElementById('modalVideos');
    const modalDescriptions = document.getElementById('modalDescriptions');
    const modalLinks = document.getElementById('modalLinks');

    // Make sure any previously embedded players are fully stopped before rendering a new event.
    clearModalVideos(modalVideos);

    // Determine if this event has a video_url
    const hasVideos = event.video_url && event.video_url.trim() !== '';
    
    // Apply the appropriate size class
    modalContent.classList.remove('modal-with-video', 'modal-without-video');
    modalContent.classList.add(hasVideos ? 'modal-with-video' : 'modal-without-video');

    // Set hero image if available, otherwise use a gradient based on categories
    if (event.image_url && event.image_url.trim() !== '') {
        modalHero.style.backgroundImage = `url('${event.image_url}')`;
        modalHero.style.backgroundSize = 'cover';
        heroScrollPosition = { x: 50, y: 50 };
        modalHero.style.backgroundPosition = '50% 50%';
        if (modalHeroExpandBtn) modalHeroExpandBtn.style.display = 'flex';
    } else {
        if (modalHeroExpandBtn) modalHeroExpandBtn.style.display = 'none';
        // Create a gradient from category colors
        const categoryList = [];
        if (Array.isArray(event.categories)) {
            categoryList.push(...event.categories);
        }
        if (event.descriptions && typeof event.descriptions === 'object') {
            categoryList.push(...Object.keys(event.descriptions));
        }
        const uniqueCategories = Array.from(new Set(categoryList));
        const gradientColors = uniqueCategories
            .map(cat => categoryColors[cat])
            .filter(Boolean);
        
        if (gradientColors.length >= 2) {
            modalHero.style.backgroundImage = `linear-gradient(135deg, ${gradientColors[0]}40 0%, ${gradientColors[1]}40 100%)`;
        } else if (gradientColors.length === 1) {
            modalHero.style.backgroundImage = `linear-gradient(135deg, ${gradientColors[0]}40 0%, ${gradientColors[0]}20 100%)`;
        } else {
            modalHero.style.backgroundImage = 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)';
        }
    }

    modalTitle.textContent = reverseHebrewEnglishTitle(event.title);

    // Show video icon only if video_url is present
    modalVideoIcon.style.display = hasVideos ? 'inline' : 'none';

    if (event.start_year === event.end_year) {
        modalYears.textContent = event.start_year.toString();
    } else {
        modalYears.textContent = `${event.start_year}-${event.end_year}`;
    }

    modalCategories.innerHTML = '';
    // Collect all categories from both categories array and descriptions
    const allCategories = [];
    if (event.categories && event.categories.length > 0) {
        allCategories.push(...event.categories);
    }
    if (event.descriptions && typeof event.descriptions === 'object') {
        allCategories.push(...Object.keys(event.descriptions));
    }
    const uniqueCats = Array.from(new Set(allCategories));
    uniqueCats.forEach(category => {
        const circle = document.createElement('span');
        circle.className = 'modal-category-circle';
        const categoryColor = categoryColors[category] || defaultColor;
        circle.style.backgroundColor = categoryColor;
        modalCategories.appendChild(circle);
    });

    modalVideos.innerHTML = '';
    if (hasVideos) {
        const videoId = extractYouTubeId(event.video_url);
        if (videoId) {
            const videoContainer = document.createElement('div');
            videoContainer.className = 'modal-video';
            const iframe = document.createElement('iframe');
            // enablejsapi allows us to send a stop command on close
            iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            videoContainer.appendChild(iframe);
            modalVideos.appendChild(videoContainer);
        }
        modalVideos.style.display = 'flex';
    } else {
        modalVideos.style.display = 'none';
    }

    modalDescriptions.innerHTML = '';
    if (event.descriptions && typeof event.descriptions === 'object') {
        Object.entries(event.descriptions).forEach(([category, description]) => {
            const descriptionItem = document.createElement('div');
            descriptionItem.className = 'modal-description-item';

            const categoryName = document.createElement('div');
            categoryName.className = 'modal-description-category';
            const categoryColor = categoryColors[category] || defaultColor;
            categoryName.style.backgroundColor = categoryColor;
            // Wrap text in span for unskew effect (parallelogram shape)
            const categorySpan = document.createElement('span');
            categorySpan.textContent = category;
            categoryName.appendChild(categorySpan);

            const descriptionText = document.createElement('div');
            descriptionText.className = 'modal-description-text';
            // Make only URLs/emails inside the description clickable, not the whole text
            linkifyText(descriptionText, description);

            descriptionItem.appendChild(categoryName);
            descriptionItem.appendChild(descriptionText);
            modalDescriptions.appendChild(descriptionItem);
        });
    }

    const modalLinksSection = document.querySelector('.modal-links-section');
    const modalFooter = document.querySelector('.modal-footer');
    const modalLinksTitle = document.getElementById('modalLinksTitle');
    modalLinks.innerHTML = '';
    const allLinks = event.links || [];
    if (allLinks.length > 0) {
        allLinks.forEach((link, index) => {
            const value = (link || '').toString().trim();
            if (!value) return;

            // If the string looks like a real URL, render it as a clickable link.
            const isUrl = /^(https?:\/\/|www\.)/i.test(value);

            if (isUrl) {
                const linkElement = document.createElement('a');
                linkElement.className = 'modal-link';
                linkElement.href = value.startsWith('http') ? value : `https://${value}`;
                linkElement.target = '_blank';
                linkElement.rel = 'noopener noreferrer';
                linkElement.textContent = value;
                modalLinks.appendChild(linkElement);
            } else {
                // Otherwise, render as plain reference text (not clickable)
                const textElement = document.createElement('div');
                textElement.className = 'modal-link-text';
                textElement.textContent = value;
                modalLinks.appendChild(textElement);
            }
        });
        modalLinksSection.style.display = 'flex';
        modalFooter.classList.remove('no-links');
        // Reset to collapsed state (default) when showing a new event
        modalLinksSection.classList.add('collapsed');
    } else {
        modalLinksSection.style.display = 'none';
        modalFooter.classList.add('no-links');
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (!skipHistoryUpdate) {
        updateEventURL(currentEventIndex, { replace: false });
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevEventBtn');
    const nextBtn = document.getElementById('nextEventBtn');

    if (prevBtn) {
        prevBtn.disabled = currentEventIndex <= 0;
    }

    if (nextBtn) {
        nextBtn.disabled = currentEventIndex >= events.length - 1;
    }
}

function showPreviousEvent() {
    if (currentEventIndex > 0) {
        const prevEvent = events[currentEventIndex - 1];
        showEventModal(prevEvent);
    }
}

function showNextEvent() {
    if (currentEventIndex < events.length - 1) {
        const nextEvent = events[currentEventIndex + 1];
        showEventModal(nextEvent);
    }
}

function closeEventModal(arg = false) {
    const skipHistoryUpdate = typeof arg === 'boolean' ? arg : false;
    const modal = document.getElementById('eventModal');
    const modalContent = modal ? modal.querySelector('.modal-content') : null;
    const modalVideos = document.getElementById('modalVideos');

    if (modalContent) {
        modalContent.classList.remove('hero-expanded');
        clearExpandedHeroDimensions(modalContent);
    }
    clearModalVideos(modalVideos);

    modal.classList.remove('active');
    document.body.style.overflow = '';

    if (!skipHistoryUpdate) {
        // Use replaceState so closing doesn't add an extra history entry.
        updateEventURL(null, { replace: true });
    }
}

// Stop and remove any YouTube iframes within the modal.
function clearModalVideos(container) {
    if (!container) return;

    const iframes = container.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
        // Try to pause nicely via the YouTube iframe API.
        try {
            iframe.contentWindow?.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
        } catch (e) {
            /* no-op */
        }

        // Brutal fallback: blank the src before removing to force playback teardown.
        iframe.src = '';
        iframe.remove();
    });

    // Replace children to guarantee nothing continues playing in the background.
    container.innerHTML = '';
    container.style.display = 'none';
}

// Initialize toggle functionality for modal links section
function initModalLinksToggle() {
    const modalLinksTitle = document.getElementById('modalLinksTitle');
    
    if (!modalLinksTitle) return;
    
    // Add click handler to toggle collapsed state
    modalLinksTitle.addEventListener('click', () => {
        const modalLinksSection = document.querySelector('.modal-links-section');
        if (modalLinksSection) {
            modalLinksSection.classList.toggle('collapsed');
        }
    });
}

// Icon paths for expand/collapse hero image button
const HERO_EXPAND_ICON = 'static/icons/rectangle-expand-vertical-svgrepo-com.svg';
const HERO_MINIMIZE_ICON = 'static/icons/arrow-minimize-vertical-svgrepo-com.svg';

function updateModalHeroExpandButtonIcon(modalContent) {
    const expandBtn = document.getElementById('modalHeroExpandBtn');
    if (!expandBtn || !modalContent) return;
    const img = expandBtn.querySelector('img');
    const isExpanded = modalContent.classList.contains('hero-expanded');
    if (img) {
        img.src = isExpanded ? HERO_MINIMIZE_ICON : HERO_EXPAND_ICON;
    }
    expandBtn.setAttribute('aria-label', isExpanded ? 'Minimize image' : 'Expand image');
    expandBtn.setAttribute('title', isExpanded ? 'Minimize image' : 'Expand image');
}

// Compute modal content dimensions so the image fits within viewport at its aspect ratio
function getExpandedImageDimensions(naturalWidth, naturalHeight) {
    const maxW = 0.9 * window.innerWidth;
    const maxH = 0.9 * window.innerHeight;
    if (naturalWidth <= 0 || naturalHeight <= 0) return { width: maxW, height: maxH };
    const scale = Math.min(maxW / naturalWidth, maxH / naturalHeight);
    return {
        width: Math.round(naturalWidth * scale),
        height: Math.round(naturalHeight * scale)
    };
}

function clearExpandedHeroDimensions(modalContent) {
    if (!modalContent) return;
    modalContent.style.width = '';
    modalContent.style.height = '';
}

// Expand/collapse hero image in event modal; size modal to each image when expanded
function initModalHeroExpand() {
    const expandBtn = document.getElementById('modalHeroExpandBtn');
    const modal = document.getElementById('eventModal');
    const modalContent = modal ? modal.querySelector('.modal-content') : null;

    if (!expandBtn || !modalContent) return;

    expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanding = !modalContent.classList.contains('hero-expanded');

        if (isExpanding) {
            const event = Number.isInteger(currentEventIndex) && currentEventIndex >= 0 && events[currentEventIndex]
                ? events[currentEventIndex]
                : null;
            const imageUrl = event && event.image_url && event.image_url.trim() ? event.image_url.trim() : null;

            if (imageUrl) {
                const img = new Image();
                img.onload = () => {
                    const { width, height } = getExpandedImageDimensions(img.naturalWidth, img.naturalHeight);
                    modalContent.classList.add('hero-expanded');
                    updateModalHeroExpandButtonIcon(modalContent);
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            modalContent.style.width = width + 'px';
                            modalContent.style.height = height + 'px';
                        });
                    });
                };
                img.onerror = () => {
                    modalContent.classList.add('hero-expanded');
                    updateModalHeroExpandButtonIcon(modalContent);
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            modalContent.style.width = '90vw';
                            modalContent.style.height = '90vh';
                        });
                    });
                };
                img.src = imageUrl;
            } else {
                modalContent.classList.add('hero-expanded');
                updateModalHeroExpandButtonIcon(modalContent);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        modalContent.style.width = '90vw';
                        modalContent.style.height = '90vh';
                    });
                });
            }
        } else {
            const modalHero = document.getElementById('modalHero');
            if (modalHero) {
                modalHero.classList.add('hero-collapsing');
                const collapseDuration = 250;
                setTimeout(() => {
                    modalHero.classList.remove('hero-collapsing');
                    modalContent.classList.remove('hero-expanded');
                    clearExpandedHeroDimensions(modalContent);
                    updateModalHeroExpandButtonIcon(modalContent);
                }, collapseDuration);
            } else {
                modalContent.classList.remove('hero-expanded');
                clearExpandedHeroDimensions(modalContent);
                updateModalHeroExpandButtonIcon(modalContent);
            }
        }
    });
}

// Mouse wheel scroll/pan on modal hero image (when image is cropped with cover)
function initModalHeroWheelScroll() {
    const modalHero = document.getElementById('modalHero');
    const modal = document.getElementById('eventModal');
    const modalContent = modal ? modal.querySelector('.modal-content') : null;

    if (!modalHero || !modalContent) return;

    const WHEEL_STEP = 0.25;
    const MIN = 0;
    const MAX = 100;

    modalHero.addEventListener('wheel', (e) => {
        if (!modal.classList.contains('active')) return;
        if (modalContent.classList.contains('hero-expanded')) return;

        const bgImage = modalHero.style.backgroundImage || '';
        const hasImage = bgImage.startsWith('url(') && !bgImage.includes('gradient');
        if (!hasImage) return;

        e.preventDefault();

        if (e.shiftKey) {
            heroScrollPosition.x = Math.min(MAX, Math.max(MIN, heroScrollPosition.x + e.deltaY * WHEEL_STEP));
        } else {
            heroScrollPosition.y = Math.min(MAX, Math.max(MIN, heroScrollPosition.y + e.deltaY * WHEEL_STEP));
        }

        modalHero.style.backgroundPosition = `${heroScrollPosition.x}% ${heroScrollPosition.y}%`;
    }, { passive: false });
}

// Initialize modal links toggle, hero expand, and hero wheel scroll when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initModalLinksToggle();
    initModalHeroExpand();
    initModalHeroWheelScroll();
});

