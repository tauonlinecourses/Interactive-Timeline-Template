// Image preloading: cache all event images for instant modal display.

let preloadedImages = new Map(); // Store preloaded Image objects
let preloadStatus = {
    total: 0,
    loaded: 0,
    failed: 0
};

/**
 * Preload all images from events array
 * @param {Array} events - Array of event objects with image_url property
 * @param {Object} options - Configuration options
 * @param {Function} options.onProgress - Callback for progress updates (loaded, total)
 * @param {Function} options.onComplete - Callback when all images are processed
 */
function preloadEventImages(events, options = {}) {
    const { onProgress, onComplete } = options;
    
    // Extract unique image URLs from events
    const imageUrls = events
        .map(event => event.image_url)
        .filter(url => url && url.trim() !== '')
        .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
    
    preloadStatus.total = imageUrls.length;
    preloadStatus.loaded = 0;
    preloadStatus.failed = 0;
    
    if (imageUrls.length === 0) {
        console.log('[Image Preloader] No images to preload');
        if (onComplete) onComplete(preloadStatus);
        return;
    }
    
    console.log(`[Image Preloader] Starting preload of ${imageUrls.length} images...`);
    
    // Preload each image
    imageUrls.forEach((url, index) => {
        const img = new Image();
        
        img.onload = () => {
            preloadStatus.loaded++;
            preloadedImages.set(url, img);
            
            if (onProgress) {
                onProgress(preloadStatus.loaded, preloadStatus.total);
            }
            
            // Check if all images are processed
            if (preloadStatus.loaded + preloadStatus.failed === preloadStatus.total) {
                console.log(`[Image Preloader] Complete: ${preloadStatus.loaded} loaded, ${preloadStatus.failed} failed`);
                if (onComplete) onComplete(preloadStatus);
            }
        };
        
        img.onerror = () => {
            preloadStatus.failed++;
            console.warn(`[Image Preloader] Failed to load: ${url}`);
            
            // Check if all images are processed
            if (preloadStatus.loaded + preloadStatus.failed === preloadStatus.total) {
                console.log(`[Image Preloader] Complete: ${preloadStatus.loaded} loaded, ${preloadStatus.failed} failed`);
                if (onComplete) onComplete(preloadStatus);
            }
        };
        
        // Start loading the image
        img.src = url;
    });
}

/**
 * Check if an image has been preloaded
 * @param {string} url - Image URL to check
 * @returns {boolean} True if image is preloaded and ready
 */
function isImagePreloaded(url) {
    return preloadedImages.has(url);
}

/**
 * Get preload status
 * @returns {Object} Current preload status
 */
function getPreloadStatus() {
    return { ...preloadStatus };
}

/**
 * Clear preloaded images cache
 */
function clearPreloadedImages() {
    preloadedImages.clear();
    preloadStatus = {
        total: 0,
        loaded: 0,
        failed: 0
    };
}
