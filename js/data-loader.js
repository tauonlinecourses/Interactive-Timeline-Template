// Data loading: fetch events JSON and bootstrap timeline.

let infoData = null;
let infoVideoId = null;

async function loadInfo() {
    try {
        const response = await fetch('static/events-files/info.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        infoData = await response.json();
        // Populate the info modal content immediately after loading
        populateInfoModal();
    } catch (error) {
        console.error('Error loading info.json:', error);
        // Set default fallback data if loading fails
        infoData = {
            "הקדמה": "לא ניתן לטעון את תוכן ההקדמה.",
            "איך משתמשים בציר הזמן?": "לא ניתן לטעון את תוכן ההוראות.",
            "קרדיטים": "לא ניתן לטעון את תוכן הקרדיטים."
        };
        populateInfoModal();
    }
}

function populateInfoModal() {
    const contentSections = document.querySelector('.info-modal-content-sections');
    
    if (infoData && contentSections) {
        contentSections.innerHTML = '';
        
        // Reset video ID
        infoVideoId = null;
        window.infoVideoId = null;
        
        // Iterate through infoData and create sections dynamically
        Object.entries(infoData).forEach(([title, text]) => {
            // Skip the video link section - it will be handled by the video player
            if (title === 'קישור לסרטון הסבר') {
                // Extract YouTube video ID from the URL
                const match = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                if (match && match[1]) {
                    infoVideoId = match[1];
                    // Make it globally accessible
                    window.infoVideoId = infoVideoId;
                }
                return; // Skip creating a text section for the video URL
            }
            
            const section = document.createElement('div');
            section.className = 'info-section';
            
            const sectionTitle = document.createElement('h3');
            sectionTitle.className = 'info-section-title';
            sectionTitle.textContent = title;
            
            const sectionText = document.createElement('p');
            sectionText.className = 'info-section-text';
            sectionText.textContent = text;
            
            section.appendChild(sectionTitle);
            section.appendChild(sectionText);
            contentSections.appendChild(section);
        });
        
        // Automatically embed video if available, otherwise show placeholder
        updateInfoVideoDisplay();
    }
}

function updateInfoVideoDisplay() {
    const videoPlaceholder = document.getElementById('infoVideoPlaceholder');
    const videoContainer = document.getElementById('infoModalVideo');
    const videoIframe = document.getElementById('infoVideoIframe');
    
    const videoId = window.infoVideoId || (typeof infoVideoId !== 'undefined' ? infoVideoId : null);
    
    if (videoId && videoPlaceholder && videoContainer && videoIframe) {
        // Embed the video automatically
        videoIframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;
        videoPlaceholder.style.display = 'none';
        videoContainer.style.display = 'block';
    } else if (videoPlaceholder && videoContainer) {
        // Show placeholder if no video
        videoPlaceholder.style.display = 'flex';
        videoContainer.style.display = 'none';
        if (videoIframe) {
            videoIframe.src = '';
        }
    }
}

async function loadEvents() {
    try {
        const response = await fetch('static/events-files/racism-events3.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        events = await response.json();

        events.forEach(event => {
            event.categories = deriveCategoriesFromDescriptions(event);
        });

        if (events.length === 0) {
            throw new Error('No events found in JSON file');
        }

        mapCategoriesToColors();
        readURLParams();
        renderCategoryButtons();

        minYear = Math.min(...events.map(event => event.start_year));
        maxYear = Math.max(...events.map(event => event.end_year));

        renderTimeline(true);

        setTimeout(() => {
            isInitialRender = false;
        }, 100);
    } catch (error) {
        console.error('Error loading events:', error);

        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') ||
            error.name === 'TypeError' || window.location.protocol === 'file:') {
            displayError(
                'Failed to load racism-events.json. This usually happens when opening the file directly.<br><br>' +
                '<strong>Solution:</strong> Run a local server:<br>' +
                '• Python: <code>python -m http.server 8000</code> then visit <code>http://localhost:8000</code><br>' +
                '• Node.js: <code>npx http-server</code> then visit the shown URL<br><br>' +
                'Or check the browser console for more details.'
            );
        } else {
            displayError(`Failed to load events. Error: ${error.message}<br><br>Please check that racism-events.json exists and is valid JSON.`);
        }
    }
}

