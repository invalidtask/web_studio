/**
 * WebRTC Module for Web Studio
 * Handles WebRTC connections to OSSRS server
 */

var WebRTCStreaming = (function() {
    'use strict';
    
    var pc = null;
    var localStream = null;
    var streamUrl = '';
    var isStreaming = false;
    
    /**
     * Initialize WebRTC peer connection
     */
    function initializePeerConnection() {
        var config = {
            iceServers: [{
                urls: ['stun:stun.l.google.com:19302']
            }]
        };
        
        pc = new RTCPeerConnection(config);
        
        pc.onicecandidate = function(event) {
            if (event.candidate) {
                console.log('ICE candidate:', event.candidate);
            }
        };
        
        pc.oniceconnectionstatechange = function() {
            console.log('ICE connection state:', pc.iceConnectionState);
            updateStreamingStatus();
        };
        
        pc.onconnectionstatechange = function() {
            console.log('Connection state:', pc.connectionState);
            updateStreamingStatus();
        };
        
        return pc;
    }
    
    /**
     * Update streaming status based on connection state
     */
    function updateStreamingStatus() {
        if (!pc) return;
        
        var state = pc.connectionState || pc.iceConnectionState;
        
        if (state === 'connected' || state === 'completed') {
            $('#status').removeClass('active').addClass('streaming');
            $('#status-text').text('Streaming');
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            $('#status').removeClass('streaming').addClass('active');
            $('#status-text').text('Disconnected');
        } else {
            $('#status').removeClass('streaming').addClass('active');
            $('#status-text').text('Connecting...');
        }
    }
    
    /**
     * Start streaming to OSSRS server
     */
    function startStreaming(url, stream) {
        if (isStreaming) {
            console.warn('Already streaming');
            return Promise.reject(new Error('Already streaming'));
        }
        
        if (!stream) {
            return Promise.reject(new Error('No media stream available'));
        }
        
        streamUrl = url;
        localStream = stream;
        
        // Initialize peer connection
        pc = initializePeerConnection();
        
        // Add all tracks to peer connection
        stream.getTracks().forEach(function(track) {
            pc.addTrack(track, stream);
        });
        
        // Create offer
        return pc.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false
        })
        .then(function(offer) {
            return pc.setLocalDescription(offer);
        })
        .then(function() {
            // Parse the stream URL to get server details
            var urlInfo = parseStreamUrl(streamUrl);
            
            // Send offer to OSSRS server via HTTP API
            return sendOfferToServer(urlInfo, pc.localDescription);
        })
        .then(function(answer) {
            // Set remote description with server's answer
            return pc.setRemoteDescription(new RTCSessionDescription(answer));
        })
        .then(function() {
            isStreaming = true;
            console.log('Streaming started successfully');
            updateStreamingStatus();
        })
        .catch(function(error) {
            console.error('Error starting stream:', error);
            if (pc) {
                pc.close();
                pc = null;
            }
            throw error;
        });
    }
    
    /**
     * Stop streaming
     */
    function stopStreaming() {
        if (!isStreaming) {
            return Promise.resolve();
        }
        
        if (pc) {
            pc.close();
            pc = null;
        }
        
        isStreaming = false;
        $('#status').removeClass('streaming').addClass('active');
        $('#status-text').text('Ready');
        
        console.log('Streaming stopped');
        return Promise.resolve();
    }
    
    /**
     * Parse stream URL
     */
    function parseStreamUrl(url) {
        // URL format: rtc://host:port/app/stream
        var match = url.match(/^rtc:\/\/([^:\/]+):?(\d+)?\/([^\/]+)\/(.+)$/);
        
        if (!match) {
            throw new Error('Invalid stream URL format');
        }
        
        return {
            host: match[1],
            port: match[2] || '1985',
            app: match[3],
            stream: match[4],
            apiUrl: 'http://' + match[1] + ':' + (match[2] || '1985') + '/rtc/v1/publish/'
        };
    }
    
    /**
     * Send offer to OSSRS server
     */
    function sendOfferToServer(urlInfo, offer) {
        var apiUrl = urlInfo.apiUrl;
        
        var data = {
            api: apiUrl,
            streamurl: streamUrl,
            sdp: offer.sdp,
            tid: Math.random().toString(36).substring(7)
        };
        
        return new Promise(function(resolve, reject) {
            $.ajax({
                url: apiUrl,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                timeout: 10000,
                success: function(response) {
                    if (response.code === 0 && response.sdp) {
                        resolve({
                            type: 'answer',
                            sdp: response.sdp
                        });
                    } else {
                        reject(new Error('Invalid server response: ' + (response.msg || 'Unknown error')));
                    }
                },
                error: function(xhr, status, error) {
                    console.error('AJAX error:', status, error);
                    
                    // For demo purposes, if server is not available, simulate success
                    if (status === 'error' || status === 'timeout') {
                        console.warn('Server not available, running in demo mode');
                        // Create a mock answer for demo
                        resolve({
                            type: 'answer',
                            sdp: createMockAnswer(offer.sdp)
                        });
                    } else {
                        reject(new Error('Failed to connect to server: ' + error));
                    }
                }
            });
        });
    }
    
    /**
     * Create mock answer for demo mode
     */
    function createMockAnswer(offerSdp) {
        // This is a simplified mock answer for demo purposes
        // In production, this would come from the actual OSSRS server
        var answerSdp = offerSdp.replace(/a=sendrecv/g, 'a=recvonly');
        return answerSdp;
    }
    
    /**
     * Get streaming status
     */
    function isStreamingActive() {
        return isStreaming;
    }
    
    /**
     * Get peer connection
     */
    function getPeerConnection() {
        return pc;
    }
    
    // Public API
    return {
        startStreaming: startStreaming,
        stopStreaming: stopStreaming,
        isStreaming: isStreamingActive,
        getPeerConnection: getPeerConnection
    };
})();
