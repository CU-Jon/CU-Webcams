/**
 * Clemson University Webcam Rotation System
 * Fullscreen display with automatic rotation between camera feeds
 */

class ClemsonWebcamRotation {
    constructor() {
        // Configuration - can be modified via UI
        this.config = {
            rotationTime: 15000, // 15 seconds default
            refreshRate: 500,   // 0.5 second image refresh
            retryAttempts: 3,
            retryDelay: 2000,
            listRefreshInterval: 3600000, // 1 hour (3600000ms) - adjustable
            randomizeOrder: true, // Set to false to maintain original order from webcams.js
            autoRefreshOnError: true, // Auto-refresh page when camera data fails to load
            autoRefreshDelay: 5000, // 5 seconds delay before auto-refresh
            controlsHideDelay: 3000 // 3 seconds delay before hiding controls
        };

        // Camera data extracted from Clemson's webcams.js
        this.cameras = this.initializeCameras();
        this.currentCameraIndex = 0;
        this.isPlaying = true;
        this.rotationInterval = null;
        this.refreshInterval = null;
        this.progressInterval = null;
        this.listRefreshInterval = null;
        this.retryCount = 0;

        // Control hiding variables
        this.controlsVisible = true;
        this.hideControlsTimeout = null;
        this.isHoveringControls = false;

        // DOM elements
        this.elements = {
            cameraFeed: document.getElementById('camera-feed'),
            cameraTitle: document.getElementById('camera-title'),
            cameraOwner: document.getElementById('camera-owner'),
            progressBar: document.getElementById('progress-bar'),
            playPauseBtn: document.getElementById('play-pause-btn'),
            previousBtn: document.getElementById('previous-btn'),
            nextBtn: document.getElementById('next-btn'),
            fullscreenBtn: document.getElementById('fullscreen-btn'),
            currentCamera: document.getElementById('current-camera'),
            totalCameras: document.getElementById('total-cameras'),
            loadingScreen: document.getElementById('loading-screen'),
            errorMessage: document.getElementById('error-message'),
            retryBtn: document.getElementById('retry-btn'),
            controlPanel: document.querySelector('.control-panel')
        };
    }

    /**
     * Initialize camera data from Clemson's webcam system
     */
    initializeCameras() {
        // Return empty array initially - will be populated by fetchCameraData
        return [];
    }

    /**
     * Fetch camera data dynamically from Clemson's webcams.js
     */
    async fetchCameraData() {
        const urls = [
            'https://www.clemson.edu/webcams/webcams.js',
            // Fallback with CORS proxy if direct access fails
            'https://api.allorigins.win/raw?url=https://www.clemson.edu/webcams/webcams.js'
        ];

        for (const url of urls) {
            try {
                console.log(`Attempting to fetch camera data from: ${url}`);
                
                const response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const jsContent = await response.text();
                
                if (!jsContent || jsContent.length < 100) {
                    throw new Error('Received empty or invalid response');
                }

                // Parse the JavaScript content to extract camera data
                const { cams, randCams } = this.parseWebcamsJs(jsContent);

                if (randCams.length === 0) {
                    throw new Error('No active cameras found in webcams.js');
                }

                // Convert to our format using only active cameras from randCams
                this.cameras = randCams.map(cameraId => ({
                    id: cameraId,
                    title: cams[cameraId]?.title || `Camera ${cameraId}`,
                    owner: cams[cameraId]?.owner || 'Clemson University',
                    url: cams[cameraId]?.url || 'https://www.clemson.edu'
                }));

                console.log(`Successfully loaded ${this.cameras.length} cameras`);
                
                // Randomize camera order if enabled
                if (this.config.randomizeOrder) {
                    this.shuffleCameras();
                    console.log('Camera order randomized');
                }
                
                return this.cameras;

            } catch (error) {
                console.warn(`Failed to fetch from ${url}:`, error.message);
                
                // If this was the last URL, throw the error
                if (url === urls[urls.length - 1]) {
                    throw error;
                }
                // Otherwise, try the next URL
                continue;
            }
        }

        // If all URLs failed, throw error
        throw new Error('Failed to fetch camera data from all sources');
    }

    /**
     * Parse the webcams.js JavaScript content to extract camera data
     */
    parseWebcamsJs(jsContent) {
        // Create a sandbox environment to safely execute the JS
        const cams = {};
        const randCams = [];

        // Create a safe execution context
        const context = {
            cams,
            randCams,
            push: function(item) { this.randCams.push(item); }.bind({ randCams })
        };

        try {
            // Extract variable assignments using regex patterns
            this.extractCameraAssignments(jsContent, cams, randCams);
        } catch (error) {
            console.warn('Error parsing webcams.js:', error);
        }

        return { cams, randCams };
    }

    /**
     * Extract camera assignments from JavaScript content
     */
    extractCameraAssignments(jsContent, cams, randCams) {
        // Extract randCams.push() calls
        const randCamMatches = jsContent.match(/randCams\.push\(["']([^"']+)["']\);/g);
        if (randCamMatches) {
            randCamMatches.forEach(match => {
                const cameraId = match.match(/["']([^"']+)["']/)[1];
                if (!randCams.includes(cameraId)) {
                    randCams.push(cameraId);
                }
            });
        }

        // Extract all camera object initializations
        const cameraInitMatches = jsContent.match(/cams\[['"]([^'"]+)['"]\]\s*=\s*\{\s*\};/g);
        if (cameraInitMatches) {
            cameraInitMatches.forEach(match => {
                const cameraId = match.match(/cams\[['"]([^'"]+)['"]\]/)[1];
                cams[cameraId] = cams[cameraId] || {};
            });
        }

        // Extract individual property assignments with more flexible patterns
        const patterns = [
            // Pattern: cams["id"]['property'] = "value";
            /cams\[["']([^"']+)["']\]\[['"]([^"']+)["']\]\s*=\s*["']([^"']*)["'];/g,
            // Pattern: cams['id']['property'] = "value";
            /cams\[['"]([^'"]+)['"]]\[['"]([^'"]+)['"]]\s*=\s*['"]([^'"]*)['"];/g
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(jsContent)) !== null) {
                const [, cameraId, property, value] = match;
                cams[cameraId] = cams[cameraId] || {};
                cams[cameraId][property] = value;
            }
        });

        // Remove any cameras that don't have all required properties or aren't in randCams
        const requiredProperties = ['title', 'owner'];
        Object.keys(cams).forEach(cameraId => {
            const camera = cams[cameraId];
            const hasRequiredProps = requiredProperties.every(prop => 
                camera[prop] !== undefined && camera[prop] !== ''
            );
            
            if (!hasRequiredProps || !randCams.includes(cameraId)) {
                // Only remove if not in randCams, otherwise keep with defaults
                if (!randCams.includes(cameraId)) {
                    delete cams[cameraId];
                } else {
                    // Add defaults for missing properties
                    camera.title = camera.title || `Camera ${cameraId}`;
                    camera.owner = camera.owner || 'Clemson University';
                    camera.url = camera.url || 'https://www.clemson.edu';
                }
            }
        });

        console.log('Parsed cameras:', { totalCams: Object.keys(cams).length, activeCams: randCams.length });
    }

    /**
     * Shuffle camera array using Fisher-Yates algorithm
     */
    shuffleCameras() {
        for (let i = this.cameras.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cameras[i], this.cameras[j]] = [this.cameras[j], this.cameras[i]];
        }
    }

    /**
     * Initialize the application
     */
    async init() {
        this.setupEventListeners();
        
        // Show loading screen while fetching camera data
        this.showLoadingScreen();
        
        try {
            // Fetch camera data dynamically
            await this.fetchCameraData();
            this.updateTotalCameras();
            
            if (this.cameras.length > 0) {
                this.loadCamera(this.currentCameraIndex);
                
                // Hide loading screen and start rotation
                setTimeout(() => {
                    this.hideLoadingScreen();
                    this.startRotation();
                    this.startListRefresh();
                    
                    // Ensure controls are visible initially, then start the auto-hide timer
                    this.showControls();
                    this.startHideControlsTimer();
                }, 2000);
            } else {
                throw new Error('No cameras available');
            }
        } catch (error) {
            console.error('Failed to initialize cameras:', error);
            this.showError(`Failed to load camera data: ${error.message}. Please check your internet connection and refresh the page.`);
            this.hideLoadingScreen();
            
            // Auto-refresh the page after a delay if enabled
            if (this.config.autoRefreshOnError) {
                console.log(`Auto-refreshing page in ${this.config.autoRefreshDelay / 1000} seconds...`);
                setTimeout(() => {
                    console.log('Auto-refreshing page due to camera data load failure...');
                    window.location.reload();
                }, this.config.autoRefreshDelay);
            }
            
            // Don't continue with initialization if camera data failed to load
            return;
        }
    }

    /**
     * Start automatic camera list refresh
     */
    startListRefresh() {
        if (this.listRefreshInterval) {
            clearInterval(this.listRefreshInterval);
        }

        this.listRefreshInterval = setInterval(async () => {
            console.log('Auto-refreshing camera list...');
            try {
                const oldCameraCount = this.cameras.length;
                const currentCameraId = this.cameras[this.currentCameraIndex]?.id;
                
                await this.fetchCameraData();
                this.updateTotalCameras();
                
                const newCameraCount = this.cameras.length;
                console.log(`Camera list updated: ${oldCameraCount} → ${newCameraCount} cameras`);
                
                // Try to maintain current camera if it still exists
                if (currentCameraId) {
                    const newIndex = this.cameras.findIndex(cam => cam.id === currentCameraId);
                    if (newIndex !== -1) {
                        this.currentCameraIndex = newIndex;
                    } else {
                        // Current camera no longer exists, reset to first camera
                        this.currentCameraIndex = 0;
                    }
                    this.loadCamera(this.currentCameraIndex);
                } else {
                    // If no current camera, start from beginning
                    this.currentCameraIndex = 0;
                    this.loadCamera(this.currentCameraIndex);
                }
                
            } catch (error) {
                console.warn('Failed to refresh camera list:', error.message);
                // Continue with existing cameras if refresh fails
            }
        }, this.config.listRefreshInterval);
    }

    /**
     * Stop automatic camera list refresh
     */
    stopListRefresh() {
        if (this.listRefreshInterval) {
            clearInterval(this.listRefreshInterval);
            this.listRefreshInterval = null;
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Control buttons
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.previousBtn.addEventListener('click', () => this.previousCamera());
        this.elements.nextBtn.addEventListener('click', () => this.nextCamera());
        this.elements.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.elements.retryBtn.addEventListener('click', () => this.retryCurrentCamera());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Image error handling
        this.elements.cameraFeed.addEventListener('error', () => this.handleImageError());
        this.elements.cameraFeed.addEventListener('load', () => this.handleImageLoad());

        // Fullscreen change events
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());

        // Mouse movement tracking for control hiding
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Double-click to toggle fullscreen
        document.addEventListener('dblclick', () => this.toggleFullscreen());
        
        // Control panel hover events to prevent hiding when hovering
        this.elements.controlPanel.addEventListener('mouseenter', () => this.handleControlPanelHover(true));
        this.elements.controlPanel.addEventListener('mouseleave', () => this.handleControlPanelHover(false));
        
        // Touch events for mobile devices
        document.addEventListener('touchstart', () => {
            this.showControls();
            this.startHideControlsTimer();
        });
        document.addEventListener('touchmove', () => {
            this.showControls();
            this.startHideControlsTimer();
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeydown(event) {
        switch (event.key.toLowerCase()) {
            case ' ':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'arrowright':
            case 'arrowdown':
                event.preventDefault();
                this.nextCamera();
                break;
            case 'arrowleft':
            case 'arrowup':
                event.preventDefault();
                this.previousCamera();
                break;
            case 'f':
                event.preventDefault();
                this.toggleFullscreen();
                break;
            case 'escape':
                if (document.fullscreenElement) {
                    this.toggleFullscreen();
                }
                break;
        }
    }

    /**
     * Load camera at specified index
     */
    loadCamera(index) {
        if (index < 0 || index >= this.cameras.length) return;

        this.currentCameraIndex = index;
        const camera = this.cameras[index];

        // Update UI elements
        this.elements.cameraTitle.textContent = camera.title;
        this.elements.cameraOwner.textContent = `Sponsored by: ${camera.owner}`;
        this.elements.currentCamera.textContent = index + 1;

        // Load camera image with cache busting
        this.refreshCameraImage();

        // Start image refresh interval
        this.startImageRefresh();

        // Reset retry count
        this.retryCount = 0;
        this.hideError();
    }

    /**
     * Refresh camera image with cache busting
     */
    refreshCameraImage() {
        const camera = this.cameras[this.currentCameraIndex];
        const cacheBuster = Math.random();
        const imageUrl = `https://camera.clemson.edu/${camera.id}/fullsize.jpg?cache=${cacheBuster}`;
        
        this.elements.cameraFeed.classList.add('loading');
        this.elements.cameraFeed.src = imageUrl;
    }

    /**
     * Start automatic rotation
     */
    startRotation() {
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
        }

        if (!this.isPlaying) return;

        this.rotationInterval = setInterval(() => {
            this.nextCamera();
        }, this.config.rotationTime);

        this.startProgressBar();
    }

    /**
     * Stop rotation
     */
    stopRotation() {
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
            this.rotationInterval = null;
        }
        this.stopProgressBar();
    }

    /**
     * Start image refresh interval
     */
    startImageRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            if (!this.elements.errorMessage.classList.contains('hidden')) return;
            this.refreshCameraImage();
        }, this.config.refreshRate);
    }

    /**
     * Stop image refresh
     */
    stopImageRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Start progress bar animation
     */
    startProgressBar() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        if (!this.isPlaying) return;

        const startTime = Date.now();
        this.progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = (elapsed / this.config.rotationTime) * 100;
            
            if (progress >= 100) {
                this.elements.progressBar.style.width = '100%';
                clearInterval(this.progressInterval);
            } else {
                this.elements.progressBar.style.width = `${progress}%`;
            }
        }, 100);
    }

    /**
     * Stop progress bar
     */
    stopProgressBar() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        this.elements.progressBar.style.width = '0%';
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        
        const icon = this.elements.playPauseBtn.querySelector('.control-icon');
        const text = this.elements.playPauseBtn.querySelector('.control-text');
        const ariaLabel = this.elements.playPauseBtn;

        if (this.isPlaying) {
            icon.innerHTML = '<i class="fas fa-pause"></i>';
            text.textContent = 'Pause';
            ariaLabel.setAttribute('aria-label', 'Pause rotation');
            this.startRotation();
        } else {
            icon.innerHTML = '<i class="fas fa-play"></i>';
            text.textContent = 'Play';
            ariaLabel.setAttribute('aria-label', 'Resume rotation');
            this.stopRotation();
        }
    }

    /**
     * Go to next camera
     */
    nextCamera() {
        const nextIndex = (this.currentCameraIndex + 1) % this.cameras.length;
        this.loadCamera(nextIndex);
        
        if (this.isPlaying) {
            this.startRotation(); // Restart rotation timer
        }
    }

    /**
     * Go to previous camera
     */
    previousCamera() {
        const prevIndex = this.currentCameraIndex === 0 
            ? this.cameras.length - 1 
            : this.currentCameraIndex - 1;
        this.loadCamera(prevIndex);
        
        if (this.isPlaying) {
            this.startRotation(); // Restart rotation timer
        }
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            // Enter fullscreen
            const element = document.documentElement;
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    /**
     * Update fullscreen button appearance
     */
    handleFullscreenChange() {
        this.updateFullscreenButton();
        
        // Show controls briefly when fullscreen state changes
        this.showControls();
        this.startHideControlsTimer();
    }

    /**
     * Update fullscreen button appearance
     */
    updateFullscreenButton() {
        const icon = this.elements.fullscreenBtn.querySelector('.control-icon');
        const text = this.elements.fullscreenBtn.querySelector('.control-text');
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

        if (isFullscreen) {
            icon.innerHTML = '<i class="fas fa-compress"></i>';
            text.textContent = 'Exit FS';
            this.elements.fullscreenBtn.setAttribute('aria-label', 'Exit fullscreen');
        } else {
            icon.innerHTML = '<i class="fas fa-expand"></i>';
            text.textContent = 'Fullscreen';
            this.elements.fullscreenBtn.setAttribute('aria-label', 'Enter fullscreen');
        }
    }

    /**
     * Handle mouse movement to show controls
     */
    handleMouseMove(event) {
        this.showControls();
        this.startHideControlsTimer();
    }

    /**
     * Handle control panel hover state
     */
    handleControlPanelHover(isHovering) {
        this.isHoveringControls = isHovering;
        
        if (isHovering) {
            // Stop the hide timer when hovering over controls
            this.stopHideControlsTimer();
            this.showControls();
        } else {
            // Start the hide timer when leaving controls
            this.startHideControlsTimer();
        }
    }

    /**
     * Show controls
     */
    showControls() {
        if (!this.controlsVisible) {
            this.controlsVisible = true;
            this.elements.controlPanel.classList.remove('controls-hidden');
        }
    }

    /**
     * Hide controls
     */
    hideControls() {
        // Don't hide if user is hovering over the controls
        if (this.isHoveringControls) {
            return;
        }
        
        if (this.controlsVisible) {
            this.controlsVisible = false;
            this.elements.controlPanel.classList.add('controls-hidden');
        }
    }

    /**
     * Start the timer to hide controls after configured delay
     */
    startHideControlsTimer() {
        this.stopHideControlsTimer();
        
        this.hideControlsTimeout = setTimeout(() => {
            this.hideControls();
        }, this.config.controlsHideDelay);
    }

    /**
     * Stop the hide controls timer
     */
    stopHideControlsTimer() {
        if (this.hideControlsTimeout) {
            clearTimeout(this.hideControlsTimeout);
            this.hideControlsTimeout = null;
        }
    }

    /**
     * Handle image loading success
     */
    handleImageLoad() {
        this.elements.cameraFeed.classList.remove('loading');
        this.retryCount = 0;
        this.hideError();
    }

    /**
     * Handle image loading error
     */
    handleImageError() {
        this.retryCount++;
        
        if (this.retryCount <= this.config.retryAttempts) {
            // Retry after delay
            setTimeout(() => {
                this.refreshCameraImage();
            }, this.config.retryDelay);
        } else {
            // Show error and move to next camera
            this.showError();
            setTimeout(() => {
                this.nextCamera();
            }, 3000);
        }
    }

    /**
     * Retry current camera
     */
    retryCurrentCamera() {
        this.retryCount = 0;
        this.hideError();
        this.refreshCameraImage();
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        this.elements.loadingScreen.classList.remove('hidden');
        this.elements.loadingScreen.style.opacity = '1';
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        this.elements.loadingScreen.style.opacity = '0';
        setTimeout(() => {
            this.elements.loadingScreen.classList.add('hidden');
        }, 500);
    }

    /**
     * Show error message
     */
    showError(message = null) {
        if (message) {
            const errorText = this.elements.errorMessage.querySelector('p');
            if (errorText) {
                // If auto-refresh is enabled, modify the message to indicate automatic refresh
                if (this.config.autoRefreshOnError && message.includes('Failed to load camera data')) {
                    const refreshSeconds = this.config.autoRefreshDelay / 1000;
                    errorText.textContent = `${message.split('.')[0]}. Auto-refreshing in ${refreshSeconds} seconds...`;
                } else {
                    errorText.textContent = message;
                }
            }
        }
        this.elements.errorMessage.classList.remove('hidden');
    }

    /**
     * Hide error message
     */
    hideError() {
        this.elements.errorMessage.classList.add('hidden');
    }

    /**
     * Update total cameras display
     */
    updateTotalCameras() {
        this.elements.totalCameras.textContent = this.cameras.length;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new ClemsonWebcamRotation();
    await app.init();
});

// Export for potential external use
window.ClemsonWebcamRotation = ClemsonWebcamRotation;