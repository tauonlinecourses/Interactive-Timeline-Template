// Modal interactions for viewing event details.

let currentEventIndex = -1;

// ==================== INFO MODAL FUNCTIONS ====================

function showInfoModal() {
    const modal = document.getElementById('infoModal');
    
    // Ensure content is populated (in case it wasn't loaded yet)
    if (typeof populateInfoModal === 'function') {
        populateInfoModal();
    } else if (typeof updateInfoVideoDisplay === 'function') {
        // If populateInfoModal already ran, just update video display
        updateInfoVideoDisplay();
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    const videoIframe = document.getElementById('infoVideoIframe');
    
    // Stop video if playing
    if (videoIframe) {
        try {
            videoIframe.contentWindow?.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
        } catch (e) { /* no-op */ }
        videoIframe.src = '';
    }
    
    // Reset video display state (will be set correctly when modal opens again)
    if (typeof updateInfoVideoDisplay === 'function') {
        updateInfoVideoDisplay();
    }
    
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function playInfoVideo() {
    const videoPlaceholder = document.getElementById('infoVideoPlaceholder');
    const videoContainer = document.getElementById('infoModalVideo');
    const videoIframe = document.getElementById('infoVideoIframe');
    
    // Get video ID from global variable set by data-loader.js
    const videoId = window.infoVideoId || (typeof infoVideoId !== 'undefined' ? infoVideoId : null);
    
    if (videoId && videoIframe) {
        videoIframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&autoplay=1`;
        if (videoPlaceholder) videoPlaceholder.style.display = 'none';
        if (videoContainer) videoContainer.style.display = 'block';
    }
}

function initInfoModal() {
    const infoBtn = document.getElementById('infoBtn');
    const infoModalCloseBtn = document.getElementById('infoModalCloseBtn');
    const infoModal = document.getElementById('infoModal');
    const videoPlaceholder = document.getElementById('infoVideoPlaceholder');
    
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
    
    if (videoPlaceholder) {
        videoPlaceholder.addEventListener('click', playInfoVideo);
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
        modalHero.style.backgroundPosition = 'center';
    } else {
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

    modalTitle.textContent = event.title;

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
            descriptionText.textContent = description;

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
            const linkElement = document.createElement('a');
            linkElement.className = 'modal-link';
            linkElement.href = link;
            linkElement.target = '_blank';
            linkElement.rel = 'noopener noreferrer';
            linkElement.textContent = link;
            modalLinks.appendChild(linkElement);
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
    const modalVideos = document.getElementById('modalVideos');

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

// Initialize modal links toggle when DOM is ready
document.addEventListener('DOMContentLoaded', initModalLinksToggle);

