<?php
/**
 * Web Studio - Browser-Based Streaming Platform
 * 
 * Entry point for the streaming studio application.
 * PHP 5.6 compatible HTML/UI generation.
 * 
 * FEATURES:
 * - Dark modern UI with 6 layout options
 * - Active speaker detection using Web Audio API
 * - Auto-spotlight mode that focuses active speaker
 * - Device selector for camera and microphone with graceful fallbacks
 * - Support for up to 4 remote guests via WebRTC
 * - Canvas-based compositor for final output
 * - Individual peer connections per guest
 * - Separate publishing connection for mixed output
 * 
 * CONFIGURATION:
 * Default signaling endpoints can be modified in the UI or in js/app.js:
 * - HTTP Publish: http://localhost:1611/api/rtc_publish
 * - WebSocket: ws://localhost:7443/publish
 * 
 * USAGE:
 * 1. Start PHP server: php -S localhost:8000
 * 2. Open http://localhost:8000/index.php in browser
 * 3. Grant camera/microphone permissions
 * 4. Select devices and start camera
 * 5. Add guests (demo mode creates mock streams)
 * 6. Choose layout or enable auto-spotlight
 * 7. Configure backend URLs and start streaming
 * 
 * @author Web Studio Team
 * @version 2.0
 * @license MIT
 */

// Set headers
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web Studio - Streaming Platform</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Web Studio</h1>
            <div class="status">
                <span class="status-indicator" id="status"></span>
                <span id="status-text">Ready</span>
            </div>
        </header>

        <main>
            <!-- Layout Selector -->
            <section class="control-panel">
                <div class="control-group">
                    <h3>Layout Selector</h3>
                    <div class="layout-mode-toggle">
                        <label>
                            <input type="checkbox" id="auto-layout-mode">
                            Auto-Spotlight Mode
                        </label>
                    </div>
                    <div class="layout-options">
                        <button class="layout-btn active" data-layout="grid-2x2">
                            <div class="layout-preview layout-grid4"></div>
                            <span>Grid 2x2</span>
                        </button>
                        <button class="layout-btn" data-layout="grid-3up">
                            <div class="layout-preview layout-grid5"></div>
                            <span>3-Up</span>
                        </button>
                        <button class="layout-btn" data-layout="grid-4up">
                            <div class="layout-preview layout-grid4"></div>
                            <span>4-Up</span>
                        </button>
                        <button class="layout-btn" data-layout="picture-in-picture">
                            <div class="layout-preview layout-pip"></div>
                            <span>PIP</span>
                        </button>
                        <button class="layout-btn" data-layout="side-by-side">
                            <div class="layout-preview layout-split2"></div>
                            <span>Side-by-Side</span>
                        </button>
                        <button class="layout-btn" data-layout="spotlight">
                            <div class="layout-preview layout-single"></div>
                            <span>Spotlight</span>
                        </button>
                    </div>
                </div>

                <!-- Webcam Selector -->
                <div class="control-group">
                    <h3>Device Selector</h3>
                    <label for="webcam-select">Camera:</label>
                    <select id="webcam-select" class="form-control">
                        <option value="">Select a camera...</option>
                    </select>
                    <label for="mic-select">Microphone:</label>
                    <select id="mic-select" class="form-control">
                        <option value="">Default microphone</option>
                    </select>
                    <button id="start-webcam" class="btn btn-primary">Start Camera</button>
                    <button id="stop-webcam" class="btn btn-secondary" disabled>Stop Camera</button>
                </div>

                <!-- Remote Guests -->
                <div class="control-group">
                    <h3>Remote Guests (Max 4)</h3>
                    <div id="guest-controls">
                        <div class="guest-item">
                            <input type="text" class="guest-id" placeholder="Guest 1 ID" data-guest="1">
                            <button class="btn-add-guest" data-guest="1">Add</button>
                            <button class="btn-remove-guest" data-guest="1" disabled>Remove</button>
                        </div>
                        <div class="guest-item">
                            <input type="text" class="guest-id" placeholder="Guest 2 ID" data-guest="2">
                            <button class="btn-add-guest" data-guest="2">Add</button>
                            <button class="btn-remove-guest" data-guest="2" disabled>Remove</button>
                        </div>
                        <div class="guest-item">
                            <input type="text" class="guest-id" placeholder="Guest 3 ID" data-guest="3">
                            <button class="btn-add-guest" data-guest="3">Add</button>
                            <button class="btn-remove-guest" data-guest="3" disabled>Remove</button>
                        </div>
                        <div class="guest-item">
                            <input type="text" class="guest-id" placeholder="Guest 4 ID" data-guest="4">
                            <button class="btn-add-guest" data-guest="4">Add</button>
                            <button class="btn-remove-guest" data-guest="4" disabled>Remove</button>
                        </div>
                    </div>
                </div>

                <!-- WebRTC Streaming -->
                <div class="control-group">
                    <h3>WebRTC Streaming</h3>
                    <div class="stream-controls">
                        <label for="publish-url">Publish URL (HTTP):</label>
                        <input type="text" id="publish-url" class="form-control" 
                               value="http://localhost:1611/api/rtc_publish" 
                               placeholder="http://localhost:1611/api/rtc_publish">
                        <label for="websocket-url">WebSocket URL:</label>
                        <input type="text" id="websocket-url" class="form-control" 
                               value="ws://localhost:7443/publish" 
                               placeholder="ws://localhost:7443/publish">
                        <button id="start-stream" class="btn btn-success">Start Streaming</button>
                        <button id="stop-stream" class="btn btn-danger" disabled>Stop Streaming</button>
                    </div>
                </div>
            </section>

            <!-- Video Preview Area -->
            <section class="video-preview">
                <h3>Preview</h3>
                <div id="video-container" class="video-container layout-grid-2x2">
                    <div class="video-slot main-video" id="slot-main" data-participant="host">
                        <video id="local-video" autoplay muted playsinline></video>
                        <div class="video-label">Host (You)</div>
                        <canvas class="audio-canvas" id="audio-canvas-host"></canvas>
                    </div>
                    <div class="video-slot guest-video" id="slot-guest-1" data-participant="guest-1" style="display:none;">
                        <video id="guest-video-1" autoplay playsinline></video>
                        <div class="video-label">Guest 1</div>
                        <canvas class="audio-canvas" id="audio-canvas-guest-1"></canvas>
                    </div>
                    <div class="video-slot guest-video" id="slot-guest-2" data-participant="guest-2" style="display:none;">
                        <video id="guest-video-2" autoplay playsinline></video>
                        <div class="video-label">Guest 2</div>
                        <canvas class="audio-canvas" id="audio-canvas-guest-2"></canvas>
                    </div>
                    <div class="video-slot guest-video" id="slot-guest-3" data-participant="guest-3" style="display:none;">
                        <video id="guest-video-3" autoplay playsinline></video>
                        <div class="video-label">Guest 3</div>
                        <canvas class="audio-canvas" id="audio-canvas-guest-3"></canvas>
                    </div>
                    <div class="video-slot guest-video" id="slot-guest-4" data-participant="guest-4" style="display:none;">
                        <video id="guest-video-4" autoplay playsinline></video>
                        <div class="video-label">Guest 4</div>
                        <canvas class="audio-canvas" id="audio-canvas-guest-4"></canvas>
                    </div>
                </div>
                <canvas id="composite-canvas" style="display:none;"></canvas>
            </section>
        </main>

        <footer>
            <p>Web Studio - Browser-Based Streaming Platform</p>
        </footer>
    </div>

    <!-- jQuery -->
    <script src="lib/jquery-1.12.4.min.js"></script>
    <!-- WebRTC Adapter -->
    <script src="lib/adapter-latest.js"></script>
    <!-- Application Scripts -->
    <script src="js/webrtc.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
