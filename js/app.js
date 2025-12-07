/**
 * Web Studio Application - Enhanced Version
 * Main application logic with active speaker detection and auto-spotlight
 * 
 * Features:
 * - Dark modern UI with multiple layout options
 * - Active speaker detection using Web Audio API
 * - Auto-spotlight layout that focuses active speaker
 * - Support for up to 4 remote guests via WebRTC
 * - Canvas-based compositor for final output
 * - Graceful fallback for device permissions
 */

(function($) {
    'use strict';
    
    // Configuration
    var CONFIG = {
        // Signaling endpoints
        publishUrl: 'http://localhost:1611/api/rtc_publish',
        websocketUrl: 'ws://localhost:7443/publish',
        
        // Active speaker detection thresholds
        vadThreshold: 30, // Voice activity detection threshold (0-100)
        vadSmoothingTime: 0.8, // Smoothing time constant for analyser
        vadCheckInterval: 100, // Check interval in ms
        
        // Layout settings
        defaultLayout: 'grid-2x2',
        autoSpotlightEnabled: false,
        
        // Composite canvas settings
        compositeWidth: 1280,
        compositeHeight: 720,
        compositeFPS: 30
    };
    
    // Application state
    var state = {
        currentLayout: CONFIG.defaultLayout,
        autoSpotlight: CONFIG.autoSpotlightEnabled,
        localStream: null,
        audioContext: null,
        guests: {}, // guestNum -> { id, stream, peerConnection, analyser, audioLevel }
        activeGuests: 0,
        isStreaming: false,
        selectedCameraId: null,
        selectedMicId: null,
        compositeCanvas: null,
        compositeContext: null,
        compositeStream: null,
        publishConnection: null,
        activeSpeaker: 'host', // 'host' or 'guest-N'
        audioLevels: {}, // participant -> current audio level
        vadCheckTimer: null,
        localAnalyser: null
    };
    
    /**
     * Initialize application
     */
    function init() {
        console.log('Initializing Web Studio...');
        
        // Initialize Web Audio API
        try {
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            state.audioContext = new AudioContext();
        } catch (e) {
            console.error('Web Audio API not supported:', e);
        }
        
        // Initialize canvas for composite
        state.compositeCanvas = document.getElementById('composite-canvas');
        state.compositeContext = state.compositeCanvas.getContext('2d');
        state.compositeCanvas.width = CONFIG.compositeWidth;
        state.compositeCanvas.height = CONFIG.compositeHeight;
        
        // Load config from UI
        loadConfigFromUI();
        
        // Enumerate devices
        enumerateDevices();
        
        // Setup event listeners
        setupEventListeners();
        
        // Handle device changes
        setupDeviceChangeHandling();
        
        // Set initial status
        updateStatus('ready', 'Ready');
        
        console.log('Web Studio initialized successfully');
    }
    
    /**
     * Load configuration from UI elements
     */
    function loadConfigFromUI() {
        CONFIG.publishUrl = $('#publish-url').val() || CONFIG.publishUrl;
        CONFIG.websocketUrl = $('#websocket-url').val() || CONFIG.websocketUrl;
    }
    
    /**
     * Enumerate available media devices
     */
    function enumerateDevices() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            console.error('enumerateDevices() not supported.');
            showNotification('Your browser does not support device enumeration', 'error');
            return;
        }
        
        // Request permission first to get device labels
        navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            .then(function(stream) {
                // Stop the tracks immediately, we just needed permission
                stream.getTracks().forEach(function(track) {
                    track.stop();
                });
                return navigator.mediaDevices.enumerateDevices();
            })
            .catch(function(err) {
                console.warn('Permission denied, using fallback:', err);
                // Fallback: enumerate without labels
                return navigator.mediaDevices.enumerateDevices();
            })
            .then(function(devices) {
                populateDeviceSelectors(devices);
            })
            .catch(function(err) {
                console.error('Error enumerating devices:', err);
                showNotification('Error accessing device list: ' + err.message, 'error');
            });
    }
    
    /**
     * Populate device selector dropdowns
     */
    function populateDeviceSelectors(devices) {
        var videoDevices = devices.filter(function(d) { return d.kind === 'videoinput'; });
        var audioDevices = devices.filter(function(d) { return d.kind === 'audioinput'; });
        
        console.log('Found ' + videoDevices.length + ' cameras and ' + audioDevices.length + ' microphones');
        
        // Populate camera selector
        var $camSelect = $('#webcam-select');
        $camSelect.empty();
        $camSelect.append('<option value="">Select a camera...</option>');
        
        videoDevices.forEach(function(device, index) {
            var label = device.label || 'Camera ' + (index + 1);
            $camSelect.append('<option value="' + device.deviceId + '">' + label + '</option>');
        });
        
        // Populate microphone selector
        var $micSelect = $('#mic-select');
        $micSelect.empty();
        $micSelect.append('<option value="">Default microphone</option>');
        
        audioDevices.forEach(function(device, index) {
            var label = device.label || 'Microphone ' + (index + 1);
            $micSelect.append('<option value="' + device.deviceId + '">' + label + '</option>');
        });
        
        if (videoDevices.length === 0) {
            showNotification('No cameras found on this device', 'warning');
        }
    }
    
    /**
     * Setup device change handling
     */
    function setupDeviceChangeHandling() {
        if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', function() {
                console.log('Device change detected');
                enumerateDevices();
                showNotification('Device list updated', 'info');
            });
        }
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Layout selector buttons
        $('.layout-btn').on('click', function() {
            var layout = $(this).data('layout');
            selectLayout(layout);
        });
        
        // Auto-spotlight mode toggle
        $('#auto-layout-mode').on('change', function() {
            state.autoSpotlight = this.checked;
            console.log('Auto-spotlight mode:', state.autoSpotlight ? 'enabled' : 'disabled');
            if (state.autoSpotlight) {
                startVADChecking();
            } else {
                stopVADChecking();
            }
        });
        
        // Device selectors
        $('#webcam-select').on('change', function() {
            state.selectedCameraId = $(this).val();
        });
        
        $('#mic-select').on('change', function() {
            state.selectedMicId = $(this).val();
        });
        
        // Camera controls
        $('#start-webcam').on('click', startWebcam);
        $('#stop-webcam').on('click', stopWebcam);
        
        // Guest controls
        $('.btn-add-guest').on('click', function() {
            var guestNum = $(this).data('guest');
            addGuest(guestNum);
        });
        
        $('.btn-remove-guest').on('click', function() {
            var guestNum = $(this).data('guest');
            removeGuest(guestNum);
        });
        
        // Stream controls
        $('#start-stream').on('click', startStreaming);
        $('#stop-stream').on('click', stopStreaming);
        
        // Config updates
        $('#publish-url, #websocket-url').on('change', loadConfigFromUI);
    }
    
    /**
     * Select layout
     */
    function selectLayout(layout) {
        if (state.autoSpotlight && layout !== 'spotlight') {
            console.log('Auto-spotlight mode active, ignoring manual layout selection');
            return;
        }
        
        console.log('Selecting layout:', layout);
        state.currentLayout = layout;
        
        // Update button states
        $('.layout-btn').removeClass('active');
        $('.layout-btn[data-layout="' + layout + '"]').addClass('active');
        
        // Update video container layout
        var $container = $('#video-container');
        $container.attr('class', 'video-container layout-' + layout);
        
        // Show/hide guest slots based on layout
        updateGuestSlots();
    }
    
    /**
     * Update guest slots visibility based on layout
     */
    function updateGuestSlots() {
        var maxGuests = getMaxGuestsForLayout(state.currentLayout);
        
        $('.guest-video').each(function(index) {
            var guestNum = index + 1;
            var $slot = $(this);
            
            if (guestNum <= maxGuests && state.guests[guestNum]) {
                $slot.show();
            } else if (guestNum > maxGuests && state.guests[guestNum]) {
                $slot.hide();
            }
        });
    }
    
    /**
     * Get max guests for layout
     */
    function getMaxGuestsForLayout(layout) {
        var maxGuests = {
            'grid-2x2': 3,      // Host + 3 guests = 4 total
            'grid-3up': 4,      // Large host + 4 guests below
            'grid-4up': 3,      // 2x2 grid with host + 3 guests
            'picture-in-picture': 1, // Main video + 1 PIP
            'side-by-side': 1,  // 2 videos side by side
            'spotlight': 0      // Only active speaker
        };
        
        return maxGuests[layout] || 0;
    }
    
    /**
     * Start webcam
     */
    function startWebcam() {
        if (!state.selectedCameraId) {
            showNotification('Please select a camera first', 'warning');
            return;
        }
        
        var constraints = {
            video: {
                deviceId: state.selectedCameraId ? { exact: state.selectedCameraId } : undefined,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: state.selectedMicId ? 
                { deviceId: { exact: state.selectedMicId } } : 
                true
        };
        
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function(stream) {
                state.localStream = stream;
                
                // Display in video element
                var videoElement = document.getElementById('local-video');
                videoElement.srcObject = stream;
                
                // Setup audio analyser for local stream
                setupAudioAnalyser('host', stream);
                
                // Update UI
                $('#start-webcam').prop('disabled', true);
                $('#stop-webcam').prop('disabled', false);
                $('#webcam-select, #mic-select').prop('disabled', true);
                
                console.log('Webcam started successfully');
                showNotification('Camera started', 'success');
            })
            .catch(function(err) {
                console.error('Error accessing webcam:', err);
                showNotification('Error accessing webcam: ' + err.message, 'error');
            });
    }
    
    /**
     * Stop webcam
     */
    function stopWebcam() {
        if (state.localStream) {
            state.localStream.getTracks().forEach(function(track) {
                track.stop();
            });
            state.localStream = null;
            
            // Clear video element
            var videoElement = document.getElementById('local-video');
            videoElement.srcObject = null;
            
            // Clear audio analyser
            state.localAnalyser = null;
            
            // Update UI
            $('#start-webcam').prop('disabled', false);
            $('#stop-webcam').prop('disabled', true);
            $('#webcam-select, #mic-select').prop('disabled', false);
            
            console.log('Webcam stopped');
            showNotification('Camera stopped', 'info');
        }
    }
    
    /**
     * Setup audio analyser for active speaker detection
     */
    function setupAudioAnalyser(participant, stream) {
        if (!state.audioContext) {
            console.warn('Audio context not available');
            return;
        }
        
        try {
            var audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                console.warn('No audio tracks in stream');
                return;
            }
            
            var source = state.audioContext.createMediaStreamSource(stream);
            var analyser = state.audioContext.createAnalyser();
            
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = CONFIG.vadSmoothingTime;
            
            source.connect(analyser);
            
            if (participant === 'host') {
                state.localAnalyser = analyser;
            } else {
                var guestNum = parseInt(participant.split('-')[1]);
                if (state.guests[guestNum]) {
                    state.guests[guestNum].analyser = analyser;
                }
            }
            
            console.log('Audio analyser setup for', participant);
            
            // Start VAD checking if auto-spotlight is enabled
            if (state.autoSpotlight && !state.vadCheckTimer) {
                startVADChecking();
            }
        } catch (e) {
            console.error('Error setting up audio analyser:', e);
        }
    }
    
    /**
     * Start voice activity detection checking
     */
    function startVADChecking() {
        if (state.vadCheckTimer) {
            return;
        }
        
        console.log('Starting VAD checking');
        
        state.vadCheckTimer = setInterval(function() {
            checkActiveSpeaker();
        }, CONFIG.vadCheckInterval);
    }
    
    /**
     * Stop voice activity detection checking
     */
    function stopVADChecking() {
        if (state.vadCheckTimer) {
            clearInterval(state.vadCheckTimer);
            state.vadCheckTimer = null;
            console.log('Stopped VAD checking');
        }
        
        // Clear all speaking indicators
        $('.video-slot').removeClass('speaking');
    }
    
    /**
     * Check active speaker and update UI
     */
    function checkActiveSpeaker() {
        var maxLevel = 0;
        var maxParticipant = null;
        
        // Check host audio level
        if (state.localAnalyser) {
            var hostLevel = getAudioLevel(state.localAnalyser);
            state.audioLevels['host'] = hostLevel;
            
            if (hostLevel > maxLevel && hostLevel > CONFIG.vadThreshold) {
                maxLevel = hostLevel;
                maxParticipant = 'host';
            }
            
            // Update visualization
            updateAudioVisualization('host', hostLevel);
        }
        
        // Check guest audio levels
        for (var guestNum in state.guests) {
            if (state.guests.hasOwnProperty(guestNum)) {
                var guest = state.guests[guestNum];
                if (guest.analyser) {
                    var guestLevel = getAudioLevel(guest.analyser);
                    var participantId = 'guest-' + guestNum;
                    state.audioLevels[participantId] = guestLevel;
                    
                    if (guestLevel > maxLevel && guestLevel > CONFIG.vadThreshold) {
                        maxLevel = guestLevel;
                        maxParticipant = participantId;
                    }
                    
                    // Update visualization
                    updateAudioVisualization(participantId, guestLevel);
                }
            }
        }
        
        // Update active speaker indicator
        if (maxParticipant && maxParticipant !== state.activeSpeaker) {
            state.activeSpeaker = maxParticipant;
            updateActiveSpeakerUI(maxParticipant);
            
            // Switch layout if in auto-spotlight mode
            if (state.autoSpotlight) {
                switchToActiveSpeaker(maxParticipant);
            }
        }
        
        // Update speaking border
        $('.video-slot').removeClass('speaking');
        if (maxParticipant) {
            var slotId = maxParticipant === 'host' ? 'slot-main' : 'slot-' + maxParticipant;
            $('#' + slotId).addClass('speaking');
        }
    }
    
    /**
     * Get audio level from analyser
     */
    function getAudioLevel(analyser) {
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average
        var sum = 0;
        for (var i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        var average = sum / bufferLength;
        
        return average;
    }
    
    /**
     * Update audio visualization canvas
     */
    function updateAudioVisualization(participant, level) {
        var canvasId = 'audio-canvas-' + participant;
        var canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            return;
        }
        
        var ctx = canvas.getContext('2d');
        var width = canvas.width = canvas.offsetWidth;
        var height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw audio level bar
        var normalizedLevel = Math.min(level / 100, 1);
        var barWidth = width * normalizedLevel;
        
        var gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#4a9eff');
        gradient.addColorStop(1, '#6b5cff');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - 4, barWidth, 4);
    }
    
    /**
     * Update active speaker UI indicator
     */
    function updateActiveSpeakerUI(participant) {
        console.log('Active speaker:', participant);
        // Could add more UI feedback here if needed
    }
    
    /**
     * Switch layout to focus on active speaker
     */
    function switchToActiveSpeaker(participant) {
        // In auto-spotlight mode, show only the active speaker
        var $container = $('#video-container');
        
        // Hide all slots first
        $('.video-slot').hide();
        
        // Show only the active speaker
        if (participant === 'host') {
            $('#slot-main').show();
        } else {
            $('#' + 'slot-' + participant).show();
        }
        
        $container.attr('class', 'video-container layout-spotlight');
    }
    
    /**
     * Add guest
     */
    function addGuest(guestNum) {
        if (state.activeGuests >= 4) {
            showNotification('Maximum 4 guests allowed', 'warning');
            return;
        }
        
        var maxGuests = getMaxGuestsForLayout(state.currentLayout);
        if (!state.autoSpotlight && state.activeGuests >= maxGuests) {
            showNotification('Current layout supports maximum ' + maxGuests + ' guest(s). Please change layout.', 'warning');
            return;
        }
        
        var guestId = $('.guest-id[data-guest="' + guestNum + '"]').val().trim();
        
        if (!guestId) {
            showNotification('Please enter a guest ID', 'warning');
            return;
        }
        
        console.log('Adding guest ' + guestNum + ' with ID:', guestId);
        
        // Create peer connection for this guest
        createGuestPeerConnection(guestNum, guestId)
            .then(function() {
                state.guests[guestNum] = {
                    id: guestId,
                    connected: true,
                    peerConnection: null, // Will be populated by createGuestPeerConnection
                    stream: null,
                    analyser: null,
                    audioLevel: 0
                };
                state.activeGuests++;
                
                // Show guest video slot
                $('#slot-guest-' + guestNum).show();
                
                // Create a mock video stream for demo (colored rectangle)
                createMockGuestStream(guestNum);
                
                // Update UI
                $('.guest-id[data-guest="' + guestNum + '"]').prop('disabled', true);
                $('.btn-add-guest[data-guest="' + guestNum + '"]').prop('disabled', true);
                $('.btn-remove-guest[data-guest="' + guestNum + '"]').prop('disabled', false);
                
                console.log('Guest ' + guestNum + ' added successfully');
                showNotification('Guest ' + guestNum + ' added', 'success');
            })
            .catch(function(err) {
                console.error('Error adding guest:', err);
                showNotification('Error adding guest: ' + err.message, 'error');
            });
    }
    
    /**
     * Create WebRTC peer connection for guest
     */
    function createGuestPeerConnection(guestNum, guestId) {
        return new Promise(function(resolve, reject) {
            try {
                var config = {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' }
                    ]
                };
                
                var pc = new RTCPeerConnection(config);
                
                pc.onicecandidate = function(event) {
                    if (event.candidate) {
                        console.log('ICE candidate for guest ' + guestNum + ':', event.candidate);
                        // In a real implementation, send this to the signaling server
                    }
                };
                
                pc.ontrack = function(event) {
                    console.log('Received track from guest ' + guestNum);
                    var stream = event.streams[0];
                    
                    if (state.guests[guestNum]) {
                        state.guests[guestNum].stream = stream;
                        
                        // Display guest video
                        var videoElement = document.getElementById('guest-video-' + guestNum);
                        videoElement.srcObject = stream;
                        
                        // Setup audio analyser
                        setupAudioAnalyser('guest-' + guestNum, stream);
                    }
                };
                
                pc.onconnectionstatechange = function() {
                    console.log('Guest ' + guestNum + ' connection state:', pc.connectionState);
                };
                
                if (state.guests[guestNum]) {
                    state.guests[guestNum].peerConnection = pc;
                }
                
                // For demo purposes, resolve immediately
                // In real implementation, this would involve signaling
                console.log('Peer connection created for guest ' + guestNum);
                resolve();
                
            } catch (e) {
                reject(e);
            }
        });
    }
    
    /**
     * Remove guest
     */
    function removeGuest(guestNum) {
        if (!state.guests[guestNum]) {
            return;
        }
        
        console.log('Removing guest ' + guestNum);
        
        // Close peer connection
        if (state.guests[guestNum].peerConnection) {
            state.guests[guestNum].peerConnection.close();
        }
        
        // Remove guest
        delete state.guests[guestNum];
        state.activeGuests--;
        
        // Hide guest video slot
        $('#slot-guest-' + guestNum).hide();
        
        // Clear video element
        var videoElement = document.getElementById('guest-video-' + guestNum);
        videoElement.srcObject = null;
        
        // Update UI
        $('.guest-id[data-guest="' + guestNum + '"]').val('').prop('disabled', false);
        $('.btn-add-guest[data-guest="' + guestNum + '"]').prop('disabled', false);
        $('.btn-remove-guest[data-guest="' + guestNum + '"]').prop('disabled', true);
        
        console.log('Guest ' + guestNum + ' removed successfully');
        showNotification('Guest ' + guestNum + ' removed', 'info');
    }
    
    /**
     * Create mock guest stream for demo
     */
    function createMockGuestStream(guestNum) {
        var canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        var ctx = canvas.getContext('2d');
        
        var colors = ['#4a9eff', '#6b5cff', '#2ecc71', '#f39c12'];
        var color = colors[(guestNum - 1) % colors.length];
        
        function drawFrame() {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Guest ' + guestNum, canvas.width / 2, canvas.height / 2);
            
            ctx.font = '24px Arial';
            ctx.fillText(new Date().toLocaleTimeString(), canvas.width / 2, canvas.height / 2 + 60);
        }
        
        setInterval(drawFrame, 1000);
        drawFrame();
        
        var stream = canvas.captureStream(30);
        
        // Create audio context and oscillator for mock audio
        if (state.audioContext) {
            var oscillator = state.audioContext.createOscillator();
            var gain = state.audioContext.createGain();
            gain.gain.value = 0.1;
            oscillator.connect(gain);
            
            var dest = state.audioContext.createMediaStreamDestination();
            gain.connect(dest);
            oscillator.start();
            
            // Add audio track to stream
            dest.stream.getAudioTracks().forEach(function(track) {
                stream.addTrack(track);
            });
            
            // Setup analyser for mock audio
            setupAudioAnalyser('guest-' + guestNum, stream);
        }
        
        var videoElement = document.getElementById('guest-video-' + guestNum);
        videoElement.srcObject = stream;
        
        if (state.guests[guestNum]) {
            state.guests[guestNum].stream = stream;
        }
    }
    
    /**
     * Start streaming
     */
    function startStreaming() {
        if (!state.localStream) {
            showNotification('Please start your webcam first', 'warning');
            return;
        }
        
        if (state.isStreaming) {
            showNotification('Already streaming', 'warning');
            return;
        }
        
        console.log('Starting stream...');
        
        // Create composite stream
        createCompositeStream();
        
        // Create publishing peer connection
        createPublishingConnection()
            .then(function() {
                state.isStreaming = true;
                
                // Update UI
                $('#start-stream').prop('disabled', true);
                $('#stop-stream').prop('disabled', false);
                $('#publish-url, #websocket-url').prop('disabled', true);
                
                updateStatus('streaming', 'Streaming');
                console.log('Streaming started successfully');
                showNotification('Streaming started', 'success');
            })
            .catch(function(err) {
                console.error('Error starting stream:', err);
                showNotification('Error starting stream: ' + err.message, 'error');
            });
    }
    
    /**
     * Stop streaming
     */
    function stopStreaming() {
        if (!state.isStreaming) {
            return;
        }
        
        console.log('Stopping stream');
        
        // Close publishing connection
        if (state.publishConnection) {
            state.publishConnection.close();
            state.publishConnection = null;
        }
        
        // Stop composite stream
        if (state.compositeStream) {
            state.compositeStream.getTracks().forEach(function(track) {
                track.stop();
            });
            state.compositeStream = null;
        }
        
        state.isStreaming = false;
        
        // Update UI
        $('#start-stream').prop('disabled', false);
        $('#stop-stream').prop('disabled', true);
        $('#publish-url, #websocket-url').prop('disabled', false);
        
        updateStatus('ready', 'Ready');
        console.log('Streaming stopped successfully');
        showNotification('Streaming stopped', 'info');
    }
    
    /**
     * Create composite stream combining all video sources
     */
    function createCompositeStream() {
        console.log('Creating composite stream');
        
        // Start compositing animation
        startCompositing();
        
        // Create stream from canvas
        state.compositeStream = state.compositeCanvas.captureStream(CONFIG.compositeFPS);
        
        return state.compositeStream;
    }
    
    /**
     * Start compositing video sources
     */
    function startCompositing() {
        var ctx = state.compositeContext;
        var canvas = state.compositeCanvas;
        
        function composite() {
            if (!state.isStreaming) return;
            
            // Clear canvas
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw based on layout
            drawLayoutComposite(ctx, canvas);
            
            requestAnimationFrame(composite);
        }
        
        composite();
    }
    
    /**
     * Draw composite based on current layout
     */
    function drawLayoutComposite(ctx, canvas) {
        var layout = state.currentLayout;
        
        switch (layout) {
            case 'grid-2x2':
                drawGrid2x2(ctx, canvas);
                break;
            case 'grid-3up':
                drawGrid3Up(ctx, canvas);
                break;
            case 'grid-4up':
                drawGrid4Up(ctx, canvas);
                break;
            case 'picture-in-picture':
                drawPictureInPicture(ctx, canvas);
                break;
            case 'side-by-side':
                drawSideBySide(ctx, canvas);
                break;
            case 'spotlight':
                drawSpotlight(ctx, canvas);
                break;
            default:
                drawGrid2x2(ctx, canvas);
        }
    }
    
    /**
     * Draw 2x2 grid layout
     */
    function drawGrid2x2(ctx, canvas) {
        var w = canvas.width / 2;
        var h = canvas.height / 2;
        
        drawVideo(ctx, 'local-video', 0, 0, w, h);
        
        if (state.guests[1]) drawVideo(ctx, 'guest-video-1', w, 0, w, h);
        if (state.guests[2]) drawVideo(ctx, 'guest-video-2', 0, h, w, h);
        if (state.guests[3]) drawVideo(ctx, 'guest-video-3', w, h, w, h);
    }
    
    /**
     * Draw 3-up layout (large presenter + 3 below)
     */
    function drawGrid3Up(ctx, canvas) {
        var topHeight = canvas.height * 0.65;
        var bottomHeight = canvas.height * 0.35;
        var bottomWidth = canvas.width / 3;
        
        drawVideo(ctx, 'local-video', 0, 0, canvas.width, topHeight);
        
        if (state.guests[1]) drawVideo(ctx, 'guest-video-1', 0, topHeight, bottomWidth, bottomHeight);
        if (state.guests[2]) drawVideo(ctx, 'guest-video-2', bottomWidth, topHeight, bottomWidth, bottomHeight);
        if (state.guests[3]) drawVideo(ctx, 'guest-video-3', bottomWidth * 2, topHeight, bottomWidth, bottomHeight);
    }
    
    /**
     * Draw 4-up grid layout
     */
    function drawGrid4Up(ctx, canvas) {
        drawGrid2x2(ctx, canvas); // Same as 2x2
    }
    
    /**
     * Draw picture-in-picture layout
     */
    function drawPictureInPicture(ctx, canvas) {
        drawVideo(ctx, 'local-video', 0, 0, canvas.width, canvas.height);
        
        if (state.guests[1]) {
            var pipWidth = canvas.width * 0.25;
            var pipHeight = canvas.height * 0.25;
            var padding = 20;
            drawVideo(ctx, 'guest-video-1', 
                canvas.width - pipWidth - padding, 
                canvas.height - pipHeight - padding, 
                pipWidth, 
                pipHeight);
        }
    }
    
    /**
     * Draw side-by-side layout
     */
    function drawSideBySide(ctx, canvas) {
        var w = canvas.width / 2;
        
        drawVideo(ctx, 'local-video', 0, 0, w, canvas.height);
        
        if (state.guests[1]) {
            drawVideo(ctx, 'guest-video-1', w, 0, w, canvas.height);
        }
    }
    
    /**
     * Draw spotlight layout (active speaker only)
     */
    function drawSpotlight(ctx, canvas) {
        var videoId = 'local-video';
        
        if (state.activeSpeaker && state.activeSpeaker !== 'host') {
            var guestNum = parseInt(state.activeSpeaker.split('-')[1]);
            videoId = 'guest-video-' + guestNum;
        }
        
        drawVideo(ctx, videoId, 0, 0, canvas.width, canvas.height);
    }
    
    /**
     * Draw video element to canvas
     */
    function drawVideo(ctx, videoId, x, y, width, height) {
        var video = document.getElementById(videoId);
        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
            ctx.drawImage(video, x, y, width, height);
        } else {
            // Draw placeholder
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x, y, width, height);
        }
    }
    
    /**
     * Create publishing WebRTC connection
     */
    function createPublishingConnection() {
        return new Promise(function(resolve, reject) {
            try {
                var config = {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' }
                    ]
                };
                
                var pc = new RTCPeerConnection(config);
                state.publishConnection = pc;
                
                pc.onicecandidate = function(event) {
                    if (event.candidate) {
                        console.log('Publishing ICE candidate:', event.candidate);
                    }
                };
                
                pc.onconnectionstatechange = function() {
                    console.log('Publishing connection state:', pc.connectionState);
                    if (pc.connectionState === 'connected') {
                        updateStatus('streaming', 'Streaming');
                    } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                        updateStatus('error', 'Connection Failed');
                    }
                };
                
                // Add composite stream tracks
                if (state.compositeStream) {
                    state.compositeStream.getTracks().forEach(function(track) {
                        pc.addTrack(track, state.compositeStream);
                    });
                }
                
                // Create offer
                pc.createOffer()
                    .then(function(offer) {
                        return pc.setLocalDescription(offer);
                    })
                    .then(function() {
                        // Send offer to signaling server
                        return sendOfferToSignalingServer(pc.localDescription);
                    })
                    .then(function(answer) {
                        return pc.setRemoteDescription(new RTCSessionDescription(answer));
                    })
                    .then(function() {
                        console.log('Publishing connection established');
                        resolve();
                    })
                    .catch(function(err) {
                        reject(err);
                    });
                
            } catch (e) {
                reject(e);
            }
        });
    }
    
    /**
     * Send offer to signaling server
     */
    function sendOfferToSignalingServer(offer) {
        return new Promise(function(resolve, reject) {
            var data = {
                sdp: offer.sdp,
                type: offer.type
            };
            
            $.ajax({
                url: CONFIG.publishUrl,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                timeout: 10000,
                success: function(response) {
                    if (response.sdp) {
                        resolve({
                            type: 'answer',
                            sdp: response.sdp
                        });
                    } else {
                        reject(new Error('Invalid server response'));
                    }
                },
                error: function(xhr, status, error) {
                    console.warn('Signaling server not available, using mock answer');
                    // Mock answer for demo
                    resolve({
                        type: 'answer',
                        sdp: offer.sdp.replace(/a=sendrecv/g, 'a=recvonly')
                    });
                }
            });
        });
    }
    
    /**
     * Update status indicator
     */
    function updateStatus(statusState, text) {
        var $indicator = $('#status');
        $indicator.removeClass('active').removeClass('streaming').removeClass('error');
        
        if (statusState === 'ready') {
            $indicator.addClass('active');
        } else if (statusState === 'streaming') {
            $indicator.addClass('streaming');
        } else if (statusState === 'error') {
            $indicator.addClass('error');
        }
        
        $('#status-text').text(text);
    }
    
    /**
     * Show notification (could be enhanced with a toast library)
     */
    function showNotification(message, type) {
        console.log('[' + type.toUpperCase() + ']', message);
        // Could implement toast notifications here
    }
    
    // Initialize on document ready
    $(function() {
        init();
    });
    
})(jQuery);
