/**
 * Web Studio Application
 * Main application logic using jQuery
 */

(function($) {
    'use strict';
    
    // Application state
    var state = {
        currentLayout: 'single',
        localStream: null,
        guests: {},
        activeGuests: 0,
        isStreaming: false,
        selectedDeviceId: null,
        compositeCanvas: null,
        compositeContext: null
    };
    
    /**
     * Initialize application
     */
    function init() {
        console.log('Initializing Web Studio...');
        
        // Initialize canvas for composite
        state.compositeCanvas = document.getElementById('composite-canvas');
        state.compositeContext = state.compositeCanvas.getContext('2d');
        
        // Enumerate video devices
        enumerateDevices();
        
        // Setup event listeners
        setupEventListeners();
        
        // Set initial status
        $('#status').addClass('active');
        $('#status-text').text('Ready');
        
        console.log('Web Studio initialized successfully');
    }
    
    /**
     * Enumerate available video devices
     */
    function enumerateDevices() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            console.error('enumerateDevices() not supported.');
            alert('Your browser does not support camera access');
            return;
        }
        
        navigator.mediaDevices.enumerateDevices()
            .then(function(devices) {
                var videoDevices = devices.filter(function(device) {
                    return device.kind === 'videoinput';
                });
                
                console.log('Found ' + videoDevices.length + ' video devices');
                
                var $select = $('#webcam-select');
                $select.empty();
                $select.append('<option value="">Select a camera...</option>');
                
                videoDevices.forEach(function(device, index) {
                    var label = device.label || 'Camera ' + (index + 1);
                    $select.append(
                        $('<option></option>')
                            .val(device.deviceId)
                            .text(label)
                    );
                });
                
                if (videoDevices.length === 0) {
                    alert('No cameras found on this device');
                }
            })
            .catch(function(err) {
                console.error('Error enumerating devices:', err);
                alert('Error accessing camera list: ' + err.message);
            });
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
        
        // Webcam controls
        $('#webcam-select').on('change', function() {
            state.selectedDeviceId = $(this).val();
        });
        
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
    }
    
    /**
     * Select layout
     */
    function selectLayout(layout) {
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
     * Update guest slots visibility
     */
    function updateGuestSlots() {
        var maxGuests = getMaxGuestsForLayout(state.currentLayout);
        
        $('.guest-video').each(function(index) {
            var guestNum = index + 1;
            var $slot = $(this);
            
            if (guestNum <= maxGuests && state.guests[guestNum]) {
                $slot.show();
            } else if (guestNum > maxGuests) {
                $slot.hide();
            }
        });
    }
    
    /**
     * Get max guests for layout
     */
    function getMaxGuestsForLayout(layout) {
        var maxGuests = {
            'single': 0,
            'picture-in-picture': 1,
            'split-2': 1,
            'grid-4': 3,
            'grid-5': 4
        };
        
        return maxGuests[layout] || 0;
    }
    
    /**
     * Start webcam
     */
    function startWebcam() {
        if (!state.selectedDeviceId) {
            alert('Please select a camera first');
            return;
        }
        
        var constraints = {
            video: {
                deviceId: state.selectedDeviceId ? { exact: state.selectedDeviceId } : undefined,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: true
        };
        
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function(stream) {
                state.localStream = stream;
                
                // Display in video element
                var videoElement = document.getElementById('local-video');
                videoElement.srcObject = stream;
                
                // Update UI
                $('#start-webcam').prop('disabled', true);
                $('#stop-webcam').prop('disabled', false);
                $('#webcam-select').prop('disabled', true);
                
                console.log('Webcam started successfully');
            })
            .catch(function(err) {
                console.error('Error accessing webcam:', err);
                alert('Error accessing webcam: ' + err.message);
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
            
            // Update UI
            $('#start-webcam').prop('disabled', false);
            $('#stop-webcam').prop('disabled', true);
            $('#webcam-select').prop('disabled', false);
            
            console.log('Webcam stopped');
        }
    }
    
    /**
     * Add guest
     */
    function addGuest(guestNum) {
        if (state.activeGuests >= 4) {
            alert('Maximum 4 guests allowed');
            return;
        }
        
        var maxGuests = getMaxGuestsForLayout(state.currentLayout);
        if (state.activeGuests >= maxGuests) {
            alert('Current layout supports maximum ' + maxGuests + ' guest(s). Please change layout.');
            return;
        }
        
        var guestId = $('.guest-id[data-guest="' + guestNum + '"]').val().trim();
        
        if (!guestId) {
            alert('Please enter a guest ID');
            return;
        }
        
        // Simulate adding a guest (in real implementation, this would establish WebRTC connection)
        console.log('Adding guest ' + guestNum + ' with ID:', guestId);
        
        state.guests[guestNum] = {
            id: guestId,
            connected: true
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
    }
    
    /**
     * Remove guest
     */
    function removeGuest(guestNum) {
        if (!state.guests[guestNum]) {
            return;
        }
        
        console.log('Removing guest ' + guestNum);
        
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
    }
    
    /**
     * Create mock guest stream for demo
     */
    function createMockGuestStream(guestNum) {
        // Create a canvas to generate a colored video stream
        var canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        var ctx = canvas.getContext('2d');
        
        // Colors for different guests
        var colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12'];
        var color = colors[(guestNum - 1) % colors.length];
        
        // Draw colored background with guest label
        function drawFrame() {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Guest ' + guestNum, canvas.width / 2, canvas.height / 2);
            
            // Add timestamp for animation
            ctx.font = '24px Arial';
            ctx.fillText(new Date().toLocaleTimeString(), canvas.width / 2, canvas.height / 2 + 60);
        }
        
        // Animate
        setInterval(drawFrame, 1000);
        drawFrame();
        
        // Create stream from canvas
        var stream = canvas.captureStream(30);
        
        // Assign to video element
        var videoElement = document.getElementById('guest-video-' + guestNum);
        videoElement.srcObject = stream;
    }
    
    /**
     * Start streaming
     */
    function startStreaming() {
        if (!state.localStream) {
            alert('Please start your webcam first');
            return;
        }
        
        if (state.isStreaming) {
            alert('Already streaming');
            return;
        }
        
        var streamUrl = $('#stream-url').val().trim();
        
        if (!streamUrl) {
            alert('Please enter a stream URL');
            return;
        }
        
        console.log('Starting stream to:', streamUrl);
        
        // Create composite stream if there are guests
        var streamToSend = state.localStream;
        
        if (state.activeGuests > 0) {
            streamToSend = createCompositeStream();
        }
        
        // Start WebRTC streaming
        WebRTCStreaming.startStreaming(streamUrl, streamToSend)
            .then(function() {
                state.isStreaming = true;
                
                // Update UI
                $('#start-stream').prop('disabled', true);
                $('#stop-stream').prop('disabled', false);
                $('#stream-url').prop('disabled', true);
                
                console.log('Streaming started successfully');
            })
            .catch(function(err) {
                console.error('Error starting stream:', err);
                alert('Error starting stream: ' + err.message);
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
        
        WebRTCStreaming.stopStreaming()
            .then(function() {
                state.isStreaming = false;
                
                // Update UI
                $('#start-stream').prop('disabled', false);
                $('#stop-stream').prop('disabled', true);
                $('#stream-url').prop('disabled', false);
                
                console.log('Streaming stopped successfully');
            })
            .catch(function(err) {
                console.error('Error stopping stream:', err);
            });
    }
    
    /**
     * Create composite stream combining all video sources
     */
    function createCompositeStream() {
        // Setup canvas size based on layout
        state.compositeCanvas.width = 1280;
        state.compositeCanvas.height = 720;
        
        // Start compositing
        startCompositing();
        
        // Return stream from canvas
        return state.compositeCanvas.captureStream(30);
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
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw based on layout
            switch (state.currentLayout) {
                case 'single':
                    drawVideo('local-video', 0, 0, canvas.width, canvas.height);
                    break;
                    
                case 'picture-in-picture':
                    drawVideo('local-video', 0, 0, canvas.width, canvas.height);
                    if (state.guests[1]) {
                        drawVideo('guest-video-1', canvas.width - 320, canvas.height - 240, 300, 225);
                    }
                    break;
                    
                case 'split-2':
                    drawVideo('local-video', 0, 0, canvas.width / 2, canvas.height);
                    if (state.guests[1]) {
                        drawVideo('guest-video-1', canvas.width / 2, 0, canvas.width / 2, canvas.height);
                    }
                    break;
                    
                case 'grid-4':
                    drawVideo('local-video', 0, 0, canvas.width / 2, canvas.height / 2);
                    if (state.guests[1]) {
                        drawVideo('guest-video-1', canvas.width / 2, 0, canvas.width / 2, canvas.height / 2);
                    }
                    if (state.guests[2]) {
                        drawVideo('guest-video-2', 0, canvas.height / 2, canvas.width / 2, canvas.height / 2);
                    }
                    if (state.guests[3]) {
                        drawVideo('guest-video-3', canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2);
                    }
                    break;
                    
                case 'grid-5':
                    drawVideo('local-video', 0, 0, canvas.width, canvas.height * 0.6);
                    var bottomHeight = canvas.height * 0.4;
                    var bottomWidth = canvas.width / 4;
                    if (state.guests[1]) {
                        drawVideo('guest-video-1', 0, canvas.height * 0.6, bottomWidth, bottomHeight);
                    }
                    if (state.guests[2]) {
                        drawVideo('guest-video-2', bottomWidth, canvas.height * 0.6, bottomWidth, bottomHeight);
                    }
                    if (state.guests[3]) {
                        drawVideo('guest-video-3', bottomWidth * 2, canvas.height * 0.6, bottomWidth, bottomHeight);
                    }
                    if (state.guests[4]) {
                        drawVideo('guest-video-4', bottomWidth * 3, canvas.height * 0.6, bottomWidth, bottomHeight);
                    }
                    break;
            }
            
            requestAnimationFrame(composite);
        }
        
        composite();
    }
    
    /**
     * Draw video element to canvas
     */
    function drawVideo(videoId, x, y, width, height) {
        var video = document.getElementById(videoId);
        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
            state.compositeContext.drawImage(video, x, y, width, height);
        }
    }
    
    // Initialize on document ready
    $(function() {
        init();
    });
    
})(jQuery);
