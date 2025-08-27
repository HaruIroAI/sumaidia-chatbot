/**
 * Preload Avatar Assets
 * Preloads all expression images to eliminate first-switch lag
 */
(function() {
    async function preloadAvatars() {
        try {
            console.info('Starting avatar preload...');
            
            // Fetch expressions configuration
            const response = await fetch('/config/expressions.json');
            if (!response.ok) {
                console.warn('Failed to load expressions config for preloading');
                return;
            }
            
            const expressions = await response.json();
            
            // Extract all unique image files
            const uniqueFiles = new Set();
            expressions.forEach(expr => {
                if (expr.files && Array.isArray(expr.files)) {
                    expr.files.forEach(file => uniqueFiles.add(file));
                }
            });
            
            const filesToLoad = Array.from(uniqueFiles);
            const totalFiles = filesToLoad.length;
            
            if (totalFiles === 0) {
                console.info('No avatar files to preload');
                return;
            }
            
            console.info(`Found ${totalFiles} unique avatar files to preload`);
            
            let loadedCount = 0;
            const loadPromises = [];
            
            // Function to load a single image
            function loadImage(src, index) {
                return new Promise((resolve) => {
                    const img = new Image();
                    
                    img.onload = () => {
                        loadedCount++;
                        console.info(`Preloaded ${loadedCount}/${totalFiles}: ${src}`);
                        resolve({ src, status: 'loaded' });
                    };
                    
                    img.onerror = () => {
                        loadedCount++;
                        console.warn(`Failed to preload ${loadedCount}/${totalFiles}: ${src}`);
                        resolve({ src, status: 'error' });
                    };
                    
                    // Use requestIdleCallback if available, otherwise setTimeout
                    const scheduleLoad = () => {
                        img.src = '/' + src; // Ensure absolute path
                    };
                    
                    if ('requestIdleCallback' in window) {
                        window.requestIdleCallback(scheduleLoad, {
                            timeout: 3000 + (index * 100) // Stagger loads
                        });
                    } else {
                        setTimeout(scheduleLoad, index * 50); // Fallback with staggered delays
                    }
                });
            }
            
            // Load all images with load distribution
            filesToLoad.forEach((file, index) => {
                loadPromises.push(loadImage(file, index));
            });
            
            // Wait for all images to load or fail
            const results = await Promise.all(loadPromises);
            
            // Summary
            const successful = results.filter(r => r.status === 'loaded').length;
            const failed = results.filter(r => r.status === 'error').length;
            
            console.info(`Avatar preload complete: ${successful} loaded, ${failed} failed out of ${totalFiles} total`);
            
            // Store preload status for debugging
            if (window.expressionEngine) {
                window.expressionEngine.preloadStatus = {
                    total: totalFiles,
                    loaded: successful,
                    failed: failed,
                    files: results
                };
            }
            
        } catch (error) {
            console.error('Error during avatar preload:', error);
        }
    }
    
    // Execute preload when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', preloadAvatars);
    } else {
        // DOM already loaded, start preload immediately
        preloadAvatars();
    }
})();