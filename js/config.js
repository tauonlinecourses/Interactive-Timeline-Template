// Shared timeline configuration, state, and DOM references.

// ── Multi-timeline support ──────────────────────────────────────────
// Each key maps a URL ?t= value to its data files, page title, and theme class.
const TIMELINES = {
    global: {
        eventsFile: 'static/events-files/global-events.json',
        infoFile: 'static/events-files/info.json',
        pageTitle: 'מהי גזענות | ציר זמן גלובלי',
        themeClass: null  // default theme, no extra class
    },
    israel: {
        eventsFile: 'static/events-files/israel-events.json',
        infoFile: 'static/events-files/israel-info.json',
        pageTitle: 'מהי גזענות | ציר זמן ישראלי',
        themeClass: 'theme-israel'
    }
};

/**
 * Detects the active timeline from the ?t= URL parameter.
 * Defaults to 'global' if the parameter is missing or unrecognized.
 */
function detectTimeline() {
    const params = new URLSearchParams(window.location.search);
    const key = (params.get('t') || '').toLowerCase();
    return TIMELINES[key] || TIMELINES.global;
}

const activeTimeline = detectTimeline();

/**
 * Reads the category color palette from CSS custom properties.
 * Must be called AFTER the theme class is applied to <body> so that
 * theme-specific overrides are in effect.
 */
function readColorPaletteFromCSS() {
    // Read from <body> so theme classes like `.theme-israel` that define
    // CSS custom properties on the body element are taken into account.
    // Fallback to documentElement for safety if body is not yet available.
    const targetElement = document.body || document.documentElement;
    const styles = getComputedStyle(targetElement);
    const palette = [];
    for (let i = 1; i <= 16; i++) {
        const color = styles.getPropertyValue(`--category-${i}-color`).trim();
        if (color) palette.push(color);
    }
    return palette.length > 0 ? palette : null; // null signals fallback
}

// Timeline Configuration
let yearWidth = 3.57; // Default width per year in pixels (max zoom out)
const minEventLabelWidth = 0; // Hide inline content on narrower blocks
const condensedYearWidthThreshold = 45; // Below this we condense year labels
// Decide which year labels to render based on the current zoom (yearWidth)
const yearLabelIntervalLevels = [
    { maxWidth: 8, interval: 100 },  // Full zoom out - show centuries only (1500, 1600, 1700...)
    { maxWidth: 40, interval: 10 },  // Far zoomed out - show decades
    { maxWidth: 90, interval: 5 },   // Keep 5-year ticks visible longer
    { maxWidth: 130, interval: 2 },
    { maxWidth: Infinity, interval: 1 } // Fully detailed
];
let minYear = null;
let maxYear = null;
let events = [];

// Color Palette - fallback colors for automatic category assignment.
// At init, these are replaced by CSS custom properties (see readColorPaletteFromCSS).
let colorPalette = [
    '#C36D53',
    '#66B973',
    '#E7B75C',
    '#305C7A',
    '#C6CB74',
    '#5e72c7',  // Blue
    '#764ba2',  // Purple
    '#993b6f',  // Pink
    '#e74c3c',  // Red
    '#f39c12',  // Orange
    '#2ecc71',  // Green
    '#1abc9c',  // Teal
    '#3498db',  // Light Blue
    '#9b59b6',  // Violet
    '#e67e22',   // Dark Orange
    '#AE563C' // original red
];

// Dynamic category to color mapping (will be populated after loading events)
let categoryColors = {};
const defaultColor = '#6c757d'; // Gray (fallback for events without categories)

// Track which categories are hidden (true = hidden, false = visible)
let hiddenCategories = {};

// Track if this is the initial render (to avoid fade-in on first load)
let isInitialRender = true;

// Track if entrance animation should play (plays on every page load)
let shouldPlayEntranceAnimation = true;
// Flag to track if entrance animation is currently in progress
let entranceAnimationInProgress = false;

// Track if we're currently zooming (to disable animations during zoom)
let isZooming = false;

// Track the number of layers that contain events
let activeLayersCount = 0;

// Fixed push-up offset: set on first timeline render (all events), then reused so timeline doesn't move when filtering
let fixedPushUpOffset = null;

// Timeline drag state
let timelineDragging = false;
let timelineDragStartX = 0;
let timelineDragStartScrollLeft = 0;

// DOM Elements
const eventsLayer = document.getElementById('eventsLayer');
const yearsLayer = document.getElementById('yearsLayer');
const reflectionLayer = document.getElementById('reflectionLayer');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomMinBtn = document.getElementById('zoomMin');
const zoomMaxBtn = document.getElementById('zoomMax');
const categoriesMenu = document.querySelector('.categories-menu');
const timelineMinimap = document.querySelector('.timeline-minimap');
const minimapCanvas = document.getElementById('timelineMinimapCanvas');
const minimapViewport = document.getElementById('minimapViewport');
const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
let minimapNeedsRedraw = true;
let minimapFrameRequested = false;
let minimapDragging = false;
let minimapHighlight = null;
let minimapResizingSide = null;
let minimapResizePreview = null;

// Tooltip setup
const eventTooltip = document.createElement('div');
eventTooltip.className = 'event-tooltip';
eventTooltip.setAttribute('role', 'tooltip');
document.body.appendChild(eventTooltip);
let tooltipFollowCursor = false;
let tooltipTargetElement = null;

// Minimap highlight overlay for syncing hover state from the main timeline
if (timelineMinimap) {
    minimapHighlight = document.createElement('div');
    minimapHighlight.id = 'minimapHighlight';
    minimapHighlight.className = 'minimap-highlight';
    minimapHighlight.style.display = 'none';
    timelineMinimap.appendChild(minimapHighlight);
}

// Utility function to fix bidirectional display of mixed Hebrew-English titles
function reverseHebrewEnglishTitle(title) {
    // Check if title contains both Hebrew and Latin characters
    const hasHebrew = /[\u0590-\u05FF]/.test(title);
    const hasLatin = /[A-Za-z]/.test(title);
    
    if (!hasHebrew || !hasLatin) {
        // If title is only Hebrew or only English, return as is
        return title;
    }
    
    // Use Unicode Left-to-Right Mark (LRM) to fix bidirectional text display
    // Pattern matches Latin text (letters, numbers, spaces between words)
    const LRM = '\u200e';
    
    // Wrap Latin/English segments with LRM marks to ensure correct display order
    // This regex finds sequences of Latin characters, digits, and spaces
    return title.replace(/([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)*)/g, `${LRM}$1${LRM}`);
}

