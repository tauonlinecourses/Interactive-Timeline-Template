# Mobile Design Guide

## Overview

This document explains the mobile-responsive design approach for the Interactive Timeline project.

## Architecture

### 1. **Dedicated Mobile Stylesheet**
- **File**: `css/mobile.css`
- **Purpose**: Centralized mobile-specific styles that override desktop styles
- **Import Order**: Loaded last in `main.css` to ensure mobile styles take precedence

### 2. **Breakpoint Strategy**

We use a **desktop-first** approach with mobile overrides:

- **Mobile**: `< 768px` (phones)
- **Tablet**: `768px - 1024px` (tablets)
- **Desktop**: `> 1024px` (desktops)

### 3. **Why This Approach?**

✅ **Pros:**
- Keeps mobile styles organized in one place
- Easy to maintain and update
- Clear separation of concerns
- Desktop styles remain untouched
- Can easily add tablet-specific styles

❌ **Alternative approaches considered:**
- **Mobile-first**: Would require rewriting all desktop styles
- **Inline media queries**: Harder to maintain, scattered across files
- **Separate mobile HTML**: Unnecessary complexity, harder to maintain

## Mobile-Specific Considerations

### Touch Interactions

1. **Larger Touch Targets**
   - Minimum 44px × 44px (Apple's recommendation)
   - Applied to buttons, zoom controls (48px × 48px)
   - Modal navigation buttons: 110px × 44px fixed size
   - Exception: Category buttons and modal nav/close buttons have custom sizing

2. **Touch-Friendly Spacing**
   - Increased padding and gaps
   - Prevent accidental taps
   - Touch highlight disabled on interactive elements (`-webkit-tap-highlight-color: transparent`)

3. **Native Touch Scrolling**
   - Uses `touch-action: pan-x` on timeline for native single-finger horizontal scrolling
   - Pinch-to-zoom handled separately by JavaScript

### Layout Adjustments

1. **Timeline Container**
   - Desktop: Fixed height (850px)
   - Mobile: Full viewport height (`100vh`) for immersive experience

2. **Events Layer**
   - Viewport-relative positioning: `top: 60px` (below categories)
   - Height: `calc(100vh - 60px - 150px)` to fit between categories and timeline line

3. **Timeline Line & Year Labels**
   - Viewport-relative: Line at `calc(100vh - 210px)`, years at `calc(100vh - 200px)`
   - CSS controls positioning on mobile (JS clears inline styles)

4. **Categories Menu**
   - Positioned at `top: 10px`
   - Compact buttons: 55-85px width, 22px height
   - Horizontal scrollable with flex-wrap
   - Hidden scrollbar with preserved scroll functionality

5. **Bottom Bar & Minimap**
   - Bottom bar stacks vertically
   - **Minimap is hidden on mobile** for cleaner interface
   - Zoom controls centered horizontally

6. **Modals**
   - Full screen (100% width, 95% height) on mobile
   - No border radius, no animation
   - Stacked content (videos above descriptions)
   - Fixed-size navigation buttons (110px × 44px)
   - Hero section: 150px height (100px in landscape)
   - Hero image crop: `.modal-hero` uses `background-position: center top` (top-aligned) in the non-expanded state

7. **Brand & Watermark**
   - Brand sticker: 80px width, positioned top-right
   - Watermark logos: Bottom-left, 50px max width

8. **Hidden Elements on Mobile**
   - Event tooltips (preview cards)
   - Reflection layer
   - Minimap

### Performance

1. **Smooth Scrolling**
   - `-webkit-overflow-scrolling: touch` for iOS momentum scrolling
   - `overscroll-behavior-x: contain` to prevent scroll chaining

2. **Optimized Rendering**
   - `will-change: auto` on mobile (vs transforms on desktop)
   - No transforms on timeline container to preserve fixed positioning

## JavaScript Integration

The `timeline.js` includes mobile-specific logic:

```javascript
// Mobile detection
const isMobile = window.innerWidth < 768;

if (!isMobile) {
    // Desktop: JS calculates dynamic positioning
    timelineLine.style.top = `${calculated}px`;
} else {
    // Mobile: Clear inline styles, let CSS media queries take effect
    timelineLine.style.top = '';
}
```

This approach ensures:
- CSS media queries control mobile layout
- No conflicting inline styles from JavaScript
- Clean separation between desktop (JS-positioned) and mobile (CSS-positioned)

## Implementation Status

### ✅ Completed
- [x] Mobile stylesheet created (`css/mobile.css`)
- [x] Import added to `main.css`
- [x] Full viewport height timeline
- [x] Viewport-relative positioning for timeline elements
- [x] Touch-friendly button sizes
- [x] Native touch scrolling via `touch-action: pan-x`
- [x] Full-screen responsive modals
- [x] Landscape orientation support
- [x] Hidden minimap, tooltips, and reflection on mobile
- [x] JS/CSS coordination for mobile layout
- [x] Compact category buttons with flex-wrap

### 🔄 Recommended Enhancements

1. **Pinch-to-Zoom Improvements**
   - Currently works via native browser pinch or wheel events
   - Consider adding explicit gesture detection for smoother control

2. **Swipe Navigation**
   - Add swipe gestures for modal navigation
   - Swipe left/right to navigate between events

3. **Collapsible Categories**
   - On very small screens, make categories menu collapsible
   - Add a hamburger menu or "Show Categories" button

4. **Vertical Timeline Option**
   - Consider a vertical timeline layout for mobile
   - Could be a toggle or automatic on very small screens

## Testing Checklist

- [ ] Test on actual mobile devices (iOS Safari, Chrome Android)
- [ ] Test in landscape and portrait orientations
- [ ] Verify touch targets are large enough
- [ ] Check modal scrolling on small screens
- [ ] Test timeline horizontal scrolling (single finger)
- [ ] Verify zoom controls work on touch
- [ ] Check category menu wrapping and scrolling
- [ ] Verify all text is readable
- [ ] Check performance on slower devices
- [ ] Test full-screen modals open/close correctly

## Landscape Mode

Special handling for landscape orientation on mobile devices:

- Timeline: Full viewport height (`100vh`)
- Events layer: Smaller top margin (70px), dynamic height with `bottom: 120px`
- Timeline line: `calc(100vh - 90px)`
- Year labels: `calc(100vh - 70px)`
- Categories: Forced `top: 10px` positioning
- Modal hero: Reduced to 100px for more content space
- Modals remain full-screen

## Browser Support

- iOS Safari 12+
- Chrome Android (latest)
- Samsung Internet
- Firefox Mobile

## Best Practices

1. **Always test on real devices** - Emulators don't capture all touch behaviors
2. **Use viewport units** - `vw`, `vh`, `calc()` for responsive sizing
3. **Prefer CSS positioning on mobile** - Let media queries handle layout, clear JS inline styles
4. **Test with slow connections** - Mobile users may have slower internet
5. **Consider data usage** - Optimize images and assets for mobile

## Future Considerations

1. **Progressive Web App (PWA)**
   - Add service worker for offline support
   - Add manifest.json for installability

2. **Accessibility**
   - Ensure touch targets meet WCAG guidelines
   - Test with screen readers on mobile

3. **Performance Monitoring**
   - Track load times on mobile
   - Monitor frame rates during interactions

## File Structure

```
css/
├── main.css          # Imports all styles (including mobile.css)
├── mobile.css        # Mobile-specific overrides (394 lines)
├── base.css          # Base styles
├── timeline.css      # Timeline styles
├── modal.css         # Modal styles
└── ...               # Other component styles

js/
├── timeline.js       # Contains mobile detection and CSS coordination logic
└── ...               # Other JavaScript modules
```

## Key CSS Sections in mobile.css

| Section | Purpose |
|---------|---------|
| Base Mobile | Body padding reset |
| Timeline | Full viewport height, touch scrolling |
| Categories Menu | Compact buttons, flex-wrap, scrollable |
| Bottom Bar | Vertical stack, hidden minimap |
| Zoom Controls | 48px touch targets |
| Events | Larger touch targets, hidden tooltips |
| Timeline Line | Viewport-relative positioning |
| Year Labels | Viewport-relative positioning |
| Brand & Watermark | Repositioned for mobile |
| Info Button | 40px touch target |
| Modals | Full-screen layout |
| Info Modal | Full-screen with vertical stacking |
| Utility | Touch-friendly defaults |
| Tablet | 768-1024px specific adjustments |
| Landscape | Orientation-specific overrides |

## Maintenance

When adding new components:
1. Create desktop styles in appropriate component CSS file
2. Add mobile overrides in `mobile.css`
3. If component uses JS positioning, add mobile check to clear inline styles
4. Test on mobile devices (portrait and landscape)
5. Update this guide if needed
