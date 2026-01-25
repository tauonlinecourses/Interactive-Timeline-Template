# Interactive Timeline

An interactive horizontal timeline visualization tool for displaying historical events. Built with vanilla JavaScript, HTML, and CSS.

## Quick Start

1. Open a terminal in this directory
2. Run: `python server.py`
3. Open your browser and go to: `http://localhost:8888/index.html`

## Why a Server?

Modern browsers block `fetch()` requests when opening HTML files directly (file:// protocol) due to CORS security restrictions. Using a local server solves this issue.

## Project Structure

```
interactive-timeline/
├── index.html              # Main HTML file with timeline UI and modals
├── server.py               # Python HTTP server for local development (port 8888)
│
├── css/                    # Modular CSS stylesheets
│   ├── main.css            # Main entry point - imports all component styles
│   ├── base.css            # Base styles, fonts, and CSS variables
│   ├── brand.css           # Brand sticker and watermark logo styles
│   ├── categories.css      # Category filter button styles
│   ├── controls.css        # Zoom control button styles
│   ├── events.css          # Event block and tooltip styles
│   ├── info-button.css     # Info button (i) styles
│   ├── info-modal.css      # Info modal popup styles
│   ├── modal.css           # Event detail modal styles
│   ├── timeline.css        # Main timeline container and minimap styles
│   ├── utilities.css       # Utility classes and helpers
│   └── years.css           # Year label styles
│
├── js/                     # Modular JavaScript modules
│   ├── app.js              # Entry point - initializes UI handlers and kicks off loading
│   ├── config.js           # Configuration, state management, and DOM references
│   ├── categories.js       # Category management, filtering, and color mapping
│   ├── data-loader.js      # Fetches and parses event data from JSON
│   ├── minimap.js          # Minimap rendering and drag/resize interactions
│   ├── modal.js            # Event and info modal functionality
│   ├── navigation.js       # URL handling, history, and error display
│   ├── timeline.js         # Core timeline rendering (events, lanes, year labels)
│   ├── visual-effects.js   # Tooltips, reflections, and visual helpers
│   └── zoom.js             # Zoom controls and wheel/pinch zoom handling
│
├── static/                 # Static assets
│   ├── events-files/       # JSON data files
│   │   ├── racism-events3.json  # Main event data (active)
│   │   ├── info.json            # Info modal content (Hebrew)
│   │   └── ...                  # Backup/alternative event files
│   ├── icons/              # SVG icons for UI controls
│   │   ├── video-icon-*.svg     # Video indicator icons
│   │   ├── *-arrow-icon-*.svg   # Navigation arrows
│   │   └── *-zoom-icon-*.svg    # Zoom control icons
│   └── images/             # Logo images and branding assets
│
├── style.css               # Legacy stylesheet (deprecated - use css/main.css)
├── features.txt            # Feature notes and planning
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
- **Automatic category extraction** from event descriptions
- **Color-coded categories** with configurable palette
- **Filter buttons** to show/hide events by category
- **URL state persistence** for category filters

### Tooltips
- **Hover tooltips** with event preview (title, years, description excerpt)
- **Smart positioning** adapts to event location and viewport
- **Cursor-following mode** for wide events

## Customizing Events

Edit `static/events-files/racism-events3.json` (or create a new JSON file and update `data-loader.js`) to add or modify events.

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

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Event name displayed on timeline and in modal |
| `start_year` | Yes | Starting year of the event |
| `end_year` | Yes | Ending year (same as start_year for single-year events) |
| `video_url` | No | YouTube URL - embedded in modal with video icon indicator |
| `image_url` | No | Hero image URL for modal and tooltip backgrounds |
| `links` | No | Array of URLs shown in expandable "Further Reading" section |
| `descriptions` | No | Object with category names as keys and narrative text as values |

### Categories

Categories are automatically derived from the keys in each event's `descriptions` object. The timeline:
- Extracts all unique categories from loaded events
- Assigns colors from the palette defined in `config.js`
- Creates filter buttons in the UI
- Allows filtering events by clicking category buttons

## Configuration

Key configuration values are in `js/config.js`:

- `yearWidth` - Default pixels per year (zoom level)
- `colorPalette` - Array of hex colors for category assignment
- `yearLabelIntervalLevels` - Zoom thresholds for year label density
- `maxLayers` - Maximum event lanes (default: 8)

## Browser Support

Works in modern browsers (Chrome, Firefox, Safari, Edge). Requires JavaScript enabled.

## Development

No build process required. Edit files directly and refresh the browser. The Python server automatically serves updated files.

### Changing the Data Source

To use a different events file, edit `js/data-loader.js` line ~96:
```javascript
const response = await fetch('static/events-files/your-events.json');
```

### Customizing the Info Modal

Edit `static/events-files/info.json` to change the info modal content. The structure is:
```json
{
  "Section Title": "Section content text",
  "Another Section": "More content...",
  "קישור לסרטון הסבר": "https://youtube.com/watch?v=..." 
}
```
The video link key (`קישור לסרטון הסבר`) is special - it embeds a YouTube video in the modal.
