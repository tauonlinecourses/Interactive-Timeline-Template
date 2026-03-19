# Interactive Timeline Template

An interactive horizontal timeline visualization tool for displaying historical events. Built with vanilla JavaScript, HTML, and CSS.

## Quick Start

Go to https://tauonlinecourses.github.io/Interactive-Timeline-Template to see the complete guide for creating new timelines beased on this template.


## Project Structure

```
interactive-timeline/
├── index.html              # Main HTML file with timeline UI and modals
├── server.py               # Python HTTP server for local development (port 8888)
│
├── css/                    # Modular CSS stylesheets
│   ├── main.css            # Main entry point - imports all component styles
│   ├── base.css            # Reset, fonts, category color CSS variables, theme overrides
│   ├── brand.css           # Brand sticker and watermark logo styles
│   ├── categories.css      # Category filter button styles
│   ├── controls.css        # Zoom control button styles
│   ├── events.css          # Event block and tooltip styles
│   ├── info-button.css     # Info button (i) styles
│   ├── info-modal.css      # Info modal popup styles
│   ├── modal.css           # Event detail modal styles
│   ├── timeline.css        # Main timeline container and minimap styles
│   ├── utilities.css       # Loading/error states
│   ├── years.css           # Year labels, timeline line, reflection
│   └── mobile.css          # Mobile/tablet responsive overrides
│
├── js/                     # Modular JavaScript (global scope, no ES modules)
│   ├── app.js              # Entry point - applies timeline config, initializes everything
│   ├── config.js           # Configuration, multi-timeline routing, state, DOM references
│   ├── categories.js       # Category extraction, color mapping, filtering, URL state
│   ├── data-loader.js      # Fetches event/info JSON, processes and renders
│   ├── image-preloader.js  # Preloads event images for smoother display
│   ├── minimap.js          # Minimap rendering and drag/resize interactions
│   ├── modal.js            # Info modal and event detail modal functionality
│   ├── navigation.js       # URL handling, browser history, error display
│   ├── timeline.js         # Core timeline rendering (events, lanes, year labels)
│   ├── visual-effects.js   # Tooltips, reflections, and visual helpers
│   └── zoom.js             # Zoom controls and wheel/pinch zoom handling
│
├── static/                 # Static assets
│   ├── events-files/       # JSON data files
│   │   ├── global-events.json  # Global timeline events
│   │   ├── israel-events.json  # Israel timeline events
│   │   ├── info.json           # Global info modal content (Hebrew)
│   │   ├── israel-info.json    # Israel info modal content (Hebrew)
│   │   └── backups/            # Backup event files
│   ├── icons/              # SVG icons for UI controls
│   └── images/             # Logo images and branding assets
│
├── style.css               # Legacy stylesheet (deprecated - use css/main.css)
├── AI_AGENT_GUIDE.md       # Detailed guide for AI agents working on this codebase
├── MOBILE_GUIDE.md         # Mobile responsiveness documentation
└── README.md               # This file
```

## Features

### Timeline Visualization
- **Horizontal scrollable timeline** with smooth drag-to-pan navigation
- **Multi-lane event layout** automatically positions overlapping events in separate lanes
- **Zoom controls** with discrete zoom levels from century view to detailed year view
- **Wheel/pinch zoom** support with anchor point preservation
- **Animated entrance** with staggered event appearance on load

### Minimap
- **Overview canvas** below the main timeline showing all events at a glance
- **Draggable viewport** indicator for quick navigation
- **Resizable viewport** handles to adjust zoom level visually
- **Hover synchronization** highlights corresponding event in minimap

### Event Details
- **Click-to-open modal** with event title, years, categories, and descriptions
- **Embedded YouTube videos** when video URLs are provided
- **Expandable links section** for additional resources
- **Previous/Next navigation** between events within the modal
- **Keyboard support** (Escape to close)

### Category System
- **Automatic category extraction** from event description keys
- **Color-coded categories** via CSS custom properties (`--category-N-color` in `base.css`)
- **Filter buttons** to show/hide events by category
- **URL state persistence** for category filters (`?hide=cat1,cat2`)

### Tooltips
- **Hover tooltips** with event preview (title, years, description excerpt)
- **Smart positioning** adapts to event location and viewport
- **Cursor-following mode** for wide events

### Responsive Design
- **Mobile optimized** with dedicated styles in `mobile.css`
- **Breakpoints**: Mobile (`< 768px`), Tablet (`768px - 1024px`), Desktop (`> 1024px`)

## URL Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `hide` | `?hide=cat1,cat2` | Comma-separated list of hidden categories |
| `event` | `?event=3` | Index of the currently open event modal |

Parameters can be combined: `?t=israel&hide=Politics&event=2`

## Customizing Events

Event data lives in JSON files under `static/events-files/`. Each timeline variant points to its own data file, configured in the `TIMELINES` object in `js/config.js`.

### Event JSON Structure

Every entry in the events array follows this structure. Only `title`, `start_year`, and `end_year` are required:

```json
{
  "title": "Event Title",
  "start_year": 1415,
  "end_year": 1600,
  "video_url": "https://www.youtube.com/watch?v=...",
  "image_url": "https://example.com/image.jpg",
  "links": [
    "https://example.com/resource1",
    "https://example.com/resource2"
  ],
  "descriptions": {
    "Category Name": "Description text for this category perspective.",
    "Another Category": "Description from another angle or theme."
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Event name displayed on timeline and in modal |
| `start_year` | number | Yes | Starting year of the event |
| `end_year` | number | Yes | Ending year (same as start_year for single-year events) |
| `video_url` | string | No | YouTube URL - embedded in modal with video icon indicator |
| `image_url` | string | No | Hero image URL for modal and tooltip backgrounds |
| `links` | string[] | No | Array of URLs shown in expandable "Further Reading" section |
| `descriptions` | object | No | Object with category names as keys and narrative text as values |

### Categories

Categories are automatically derived from the keys in each event's `descriptions` object. The timeline:
- Extracts all unique categories from loaded events
- Assigns colors from the CSS custom properties defined in `css/base.css`
- Creates filter buttons in the UI
- Allows filtering events by clicking category buttons

## Configuration

### Timeline Variants

Timeline variants are defined in the `TIMELINES` object in `js/config.js`. Each entry specifies:

| Property | Description |
|----------|-------------|
| `eventsFile` | Path to the events JSON file |
| `infoFile` | Path to the info modal JSON file |
| `pageTitle` | Value set as `document.title` |
| `themeClass` | CSS class added to `<body>` (or `null` for default theme) |

### Adding a New Timeline Variant

1. Add an entry to the `TIMELINES` object in `js/config.js`
2. Create the corresponding JSON data files in `static/events-files/`
3. (Optional) Add a theme class in `css/base.css` to override `--category-N-color` variables
4. Access via `index.html?t=<key>` where `<key>` matches your new `TIMELINES` key

### Category Colors

Category colors are defined as CSS custom properties in `css/base.css`:

```css
:root {
    --category-1-color: #C36D53;
    --category-2-color: #66B973;
    /* ... up to --category-16-color */
}


## Browser Support

Works in modern browsers (Chrome, Firefox, Safari, Edge). Requires JavaScript enabled.

## Development

No build process required. Edit files directly and refresh the browser. The Python server automatically serves updated files.

All JavaScript modules share state through global variables (no ES modules). Script loading order in `index.html` matters -- `config.js` must load first, and `app.js` must load last.
