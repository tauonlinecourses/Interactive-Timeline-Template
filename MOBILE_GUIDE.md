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
   - Applied to buttons, category filters, zoom controls

2. **Touch-Friendly Spacing**
   - Increased padding and gaps
   - Prevent accidental taps

3. **Touch Event Support** (Future Enhancement)
   - Current: Uses mouse events (works on mobile but not optimal)
   - Recommended: Add `touchstart`, `touchmove`, `touchend` for better mobile dragging

### Layout Adjustments

1. **Timeline Height**
   - Desktop: 850px
   - Mobile: 600px (saves vertical space)

2. **Categories Menu**
   - Horizontal scrollable on mobile
   - Smaller buttons (120px vs 150px)
   - Positioned higher (60px vs 100px)

3. **Bottom Bar**
   - Stacks vertically on mobile
   - Minimap first, then controls
   - Full width with padding

4. **Modals**
   - 95% width on mobile
   - Stacked content (videos above descriptions)
   - Larger close buttons

### Performance

1. **Smooth Scrolling**
   - `-webkit-overflow-scrolling: touch` for iOS
   - `overscroll-behavior-x: contain` to prevent scroll chaining

2. **Reduced Animations**
   - Consider reducing animation complexity on mobile
   - Use `prefers-reduced-motion` media query

## Implementation Status

### ✅ Completed
- [x] Mobile stylesheet created (`css/mobile.css`)
- [x] Import added to `main.css`
- [x] Base mobile styles for all components
- [x] Touch-friendly button sizes
- [x] Responsive modals
- [x] Landscape orientation support

### 🔄 Recommended Enhancements

1. **Touch Event Support**
   ```javascript
   // In timeline.js - add touch event listeners
   dragSurface.addEventListener('touchstart', startDrag, { passive: false });
   dragSurface.addEventListener('touchmove', handleDrag, { passive: false });
   dragSurface.addEventListener('touchend', endDrag);
   ```

2. **Pinch-to-Zoom**
   - Currently uses wheel events (works on some mobile browsers)
   - Consider adding explicit pinch gesture detection

3. **Swipe Navigation**
   - Add swipe gestures for modal navigation
   - Swipe left/right to navigate between events

4. **Collapsible Categories**
   - On very small screens, make categories menu collapsible
   - Add a hamburger menu or "Show Categories" button

5. **Vertical Timeline Option**
   - Consider a vertical timeline layout for mobile
   - Could be a toggle or automatic on very small screens

## Testing Checklist

- [ ] Test on actual mobile devices (iOS Safari, Chrome Android)
- [ ] Test in landscape and portrait orientations
- [ ] Verify touch targets are large enough
- [ ] Check modal scrolling on small screens
- [ ] Test timeline dragging/scrolling
- [ ] Verify zoom controls work on touch
- [ ] Check category menu scrolling
- [ ] Test minimap interactions
- [ ] Verify all text is readable
- [ ] Check performance on slower devices

## Browser Support

- iOS Safari 12+
- Chrome Android (latest)
- Samsung Internet
- Firefox Mobile

## Best Practices

1. **Always test on real devices** - Emulators don't capture all touch behaviors
2. **Use viewport units** - `vw`, `vh`, `vmin`, `vmax` for responsive sizing
3. **Avoid fixed pixel values** - Use relative units (`rem`, `em`, `%`)
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
├── mobile.css        # Mobile-specific overrides
├── base.css          # Base styles
├── timeline.css      # Timeline styles (has some mobile queries)
├── modal.css         # Modal styles (has some mobile queries)
└── ...               # Other component styles
```

## Maintenance

When adding new components:
1. Create desktop styles in appropriate component CSS file
2. Add mobile overrides in `mobile.css`
3. Test on mobile devices
4. Update this guide if needed
