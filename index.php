<?php
// Browser-Based Streaming Studio
// PHP 5.6 compatible

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
                    <div class="layout-options">
                        <button class="layout-btn active" data-layout="single">
                            <div class="layout-preview layout-single"></div>
                            <span>Single</span>
                        </button>
                        <button class="layout-btn" data-layout="picture-in-picture">
                            <div class="layout-preview layout-pip"></div>
                            <span>PIP</span>
                        </button>
                        <button class="layout-btn" data-layout="split-2">
                            <div class="layout-preview layout-split2"></div>
                            <span>Split 2</span>
                        </button>
                        <button class="layout-btn" data-layout="grid-4">
                            <div class="layout-preview layout-grid4"></div>
                            <span>Grid 4</span>
                        </button>
                        <button class="layout-btn" data-layout="grid-5">
                            <div class="layout-preview layout-grid5"></div>
                            <span>Grid 5</span>
                        </button>
                    </div>
                </div>

                <!-- Webcam Selector -->
                <div class="control-group">
                    <h3>Webcam Selector</h3>
                    <select id="webcam-select" class="form-control">
                        <option value="">Select a camera...</option>
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
                        <label for="stream-url">OSSRS Server URL:</label>
                        <input type="text" id="stream-url" class="form-control" 
                               value="rtc://localhost:1985/live/livestream" 
                               placeholder="rtc://server:port/app/stream">
                        <button id="start-stream" class="btn btn-success">Start Streaming</button>
                        <button id="stop-stream" class="btn btn-danger" disabled>Stop Streaming</button>
                    </div>
                </div>
            </section>

            <!-- Video Preview Area -->
            <section class="video-preview">
                <h3>Preview</h3>
                <div id="video-container" class="video-container layout-single">
                    <div class="video-slot main-video" id="slot-main">
                        <video id="local-video" autoplay muted playsinline></video>
                        <div class="video-label">Local Camera</div>
                    </div>
                    <div class="video-slot guest-video" id="slot-guest-1" style="display:none;">
                        <video id="guest-video-1" autoplay playsinline></video>
                        <div class="video-label">Guest 1</div>
                    </div>
                    <div class="video-slot guest-video" id="slot-guest-2" style="display:none;">
                        <video id="guest-video-2" autoplay playsinline></video>
                        <div class="video-label">Guest 2</div>
                    </div>
                    <div class="video-slot guest-video" id="slot-guest-3" style="display:none;">
                        <video id="guest-video-3" autoplay playsinline></video>
                        <div class="video-label">Guest 3</div>
                    </div>
                    <div class="video-slot guest-video" id="slot-guest-4" style="display:none;">
                        <video id="guest-video-4" autoplay playsinline></video>
                        <div class="video-label">Guest 4</div>
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
