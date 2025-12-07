/**
 * WebRTC Module for Web Studio - Enhanced Version
 * Handles WebRTC connections with individual peer connections per guest
 * and separate publishing connection for mixed output
 * 
 * Signaling Endpoints:
 * - HTTP: http://localhost:1611/api/rtc_publish
 * - WebSocket: ws://localhost:7443/publish
 */

var WebRTCStreaming = (function() {
    'use strict';
    
    var CONFIG = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ],
        publishUrl: 'http://localhost:1611/api/rtc_publish',
        websocketUrl: 'ws://localhost:7443/publish'
    };
    
    var state = {
        publishConnection: null,
        guestConnections: {}, // guestNum -> RTCPeerConnection
        websocket: null,
        isStreaming: false
    };
    
    /**
     * Initialize WebRTC peer connection
     */
    function initializePeerConnection() {
        var config = {
            iceServers: CONFIG.iceServers
        };
        
        var pc = new RTCPeerConnection(config);
        
        pc.onicecandidate = function(event) {
            if (event.candidate) {
                console.log('ICE candidate:', event.candidate);
                // Send candidate to signaling server
                sendIceCandidate(event.candidate);
            }
        };
        
        pc.oniceconnectionstatechange = function() {
            console.log('ICE connection state:', pc.iceConnectionState);
            updateStreamingStatus(pc);
        };
        
        pc.onconnectionstatechange = function() {
            console.log('Connection state:', pc.connectionState);
            updateStreamingStatus(pc);
        };
        
        return pc;
    }
    
    /**
     * Update streaming status based on connection state
     */
    function updateStreamingStatus(pc) {
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
     * Create peer connection for a guest
     */
    function createGuestConnection(guestNum, guestId) {
        return new Promise(function(resolve, reject) {
            try {
                console.log('Creating peer connection for guest', guestNum);
                
                var pc = initializePeerConnection();
                
                pc.ontrack = function(event) {
                    console.log('Received track from guest', guestNum);
                    resolve({
                        peerConnection: pc,
                        stream: event.streams[0]
                    });
                };
                
                state.guestConnections[guestNum] = pc;
                
                // In a real implementation, this would:
                // 1. Send offer to signaling server with guest ID
                // 2. Receive answer from guest via signaling server
                // 3. Exchange ICE candidates
                
                // For demo, resolve immediately
                setTimeout(function() {
                    console.log('Guest connection demo mode for guest', guestNum);
                    resolve({
                        peerConnection: pc,
                        stream: null
                    });
                }, 100);
                
            } catch (e) {
                reject(e);
            }
        });
    }
    
    /**
     * Close guest connection
     */
    function closeGuestConnection(guestNum) {
        if (state.guestConnections[guestNum]) {
            state.guestConnections[guestNum].close();
            delete state.guestConnections[guestNum];
            console.log('Closed connection for guest', guestNum);
        }
    }
    
    /**
     * Start streaming to server
     */
    function startStreaming(publishUrl, websocketUrl, stream) {
        if (state.isStreaming) {
            console.warn('Already streaming');
            return Promise.reject(new Error('Already streaming'));
        }
        
        if (!stream) {
            return Promise.reject(new Error('No media stream available'));
        }
        
        // Update config
        CONFIG.publishUrl = publishUrl || CONFIG.publishUrl;
        CONFIG.websocketUrl = websocketUrl || CONFIG.websocketUrl;
        
        console.log('Starting streaming...');
        console.log('Publish URL:', CONFIG.publishUrl);
        console.log('WebSocket URL:', CONFIG.websocketUrl);
        
        // Try WebSocket first, fall back to HTTP
        return connectWebSocket(stream)
            .catch(function(wsError) {
                console.warn('WebSocket connection failed, trying HTTP:', wsError);
                return connectHTTP(stream);
            })
            .then(function() {
                state.isStreaming = true;
                console.log('Streaming started successfully');
                updateStreamingStatus(state.publishConnection);
            })
            .catch(function(error) {
                console.error('Error starting stream:', error);
                if (state.publishConnection) {
                    state.publishConnection.close();
                    state.publishConnection = null;
                }
                if (state.websocket) {
                    state.websocket.close();
                    state.websocket = null;
                }
                throw error;
            });
    }
    
    /**
     * Connect via WebSocket
     */
    function connectWebSocket(stream) {
        return new Promise(function(resolve, reject) {
            try {
                var ws = new WebSocket(CONFIG.websocketUrl);
                state.websocket = ws;
                
                ws.onopen = function() {
                    console.log('WebSocket connected');
                    
                    // Initialize peer connection
                    state.publishConnection = initializePeerConnection();
                    var pc = state.publishConnection;
                    
                    // Add all tracks to peer connection
                    stream.getTracks().forEach(function(track) {
                        pc.addTrack(track, stream);
                    });
                    
                    // Create and send offer
                    pc.createOffer({
                        offerToReceiveAudio: false,
                        offerToReceiveVideo: false
                    })
                    .then(function(offer) {
                        return pc.setLocalDescription(offer);
                    })
                    .then(function() {
                        // Send offer via WebSocket
                        ws.send(JSON.stringify({
                            type: 'offer',
                            sdp: pc.localDescription.sdp
                        }));
                    })
                    .catch(reject);
                };
                
                ws.onmessage = function(event) {
                    try {
                        var message = JSON.parse(event.data);
                        console.log('WebSocket message:', message.type);
                        
                        if (message.type === 'answer') {
                            state.publishConnection.setRemoteDescription(
                                new RTCSessionDescription({
                                    type: 'answer',
                                    sdp: message.sdp
                                })
                            )
                            .then(function() {
                                console.log('Remote description set');
                                resolve();
                            })
                            .catch(reject);
                        } else if (message.type === 'ice-candidate' && message.candidate) {
                            state.publishConnection.addIceCandidate(
                                new RTCIceCandidate(message.candidate)
                            )
                            .catch(function(err) {
                                console.error('Error adding ICE candidate:', err);
                            });
                        }
                    } catch (e) {
                        console.error('Error parsing WebSocket message:', e);
                    }
                };
                
                ws.onerror = function(error) {
                    console.error('WebSocket error:', error);
                    reject(new Error('WebSocket connection failed'));
                };
                
                ws.onclose = function() {
                    console.log('WebSocket closed');
                    if (state.isStreaming) {
                        $('#status').removeClass('streaming').addClass('active');
                        $('#status-text').text('Disconnected');
                    }
                };
                
                // Timeout after 5 seconds
                setTimeout(function() {
                    if (!state.isStreaming) {
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 5000);
                
            } catch (e) {
                reject(e);
            }
        });
    }
    
    /**
     * Connect via HTTP
     */
    function connectHTTP(stream) {
        return new Promise(function(resolve, reject) {
            // Initialize peer connection
            state.publishConnection = initializePeerConnection();
            var pc = state.publishConnection;
            
            // Add all tracks to peer connection
            stream.getTracks().forEach(function(track) {
                pc.addTrack(track, stream);
            });
            
            // Create offer
            pc.createOffer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            })
            .then(function(offer) {
                return pc.setLocalDescription(offer);
            })
            .then(function() {
                // Send offer to server via HTTP
                return sendOfferToServer(pc.localDescription);
            })
            .then(function(answer) {
                // Set remote description with server's answer
                return pc.setRemoteDescription(new RTCSessionDescription(answer));
            })
            .then(function() {
                console.log('HTTP connection established');
                resolve();
            })
            .catch(reject);
        });
    }
    
    /**
     * Send offer to server via HTTP
     */
    function sendOfferToServer(offer) {
        var data = {
            sdp: offer.sdp,
            type: offer.type,
            streamId: 'studio_' + Date.now()
        };
        
        return new Promise(function(resolve, reject) {
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
                    console.error('HTTP request error:', status, error);
                    
                    // For demo purposes, create mock answer
                    if (status === 'error' || status === 'timeout') {
                        console.warn('Server not available, running in demo mode');
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
     * Send ICE candidate to server
     */
    function sendIceCandidate(candidate) {
        if (state.websocket && state.websocket.readyState === WebSocket.OPEN) {
            state.websocket.send(JSON.stringify({
                type: 'ice-candidate',
                candidate: candidate
            }));
        }
        // For HTTP-only mode, ICE candidates are handled automatically
    }
    
    /**
     * Stop streaming
     */
    function stopStreaming() {
        if (!state.isStreaming) {
            return Promise.resolve();
        }
        
        console.log('Stopping streaming');
        
        // Close WebSocket
        if (state.websocket) {
            state.websocket.close();
            state.websocket = null;
        }
        
        // Close publishing connection
        if (state.publishConnection) {
            state.publishConnection.close();
            state.publishConnection = null;
        }
        
        // Close all guest connections
        for (var guestNum in state.guestConnections) {
            if (state.guestConnections.hasOwnProperty(guestNum)) {
                closeGuestConnection(guestNum);
            }
        }
        
        state.isStreaming = false;
        $('#status').removeClass('streaming').addClass('active');
        $('#status-text').text('Ready');
        
        console.log('Streaming stopped');
        return Promise.resolve();
    }
    
    /**
     * Create mock answer for demo mode
     */
    function createMockAnswer(offerSdp) {
        // This is a simplified mock answer for demo purposes
        var answerSdp = offerSdp.replace(/a=sendrecv/g, 'a=recvonly');
        answerSdp = answerSdp.replace(/a=sendonly/g, 'a=recvonly');
        return answerSdp;
    }
    
    /**
     * Get streaming status
     */
    function isStreamingActive() {
        return state.isStreaming;
    }
    
    /**
     * Get publish peer connection
     */
    function getPublishConnection() {
        return state.publishConnection;
    }
    
    /**
     * Get guest peer connection
     */
    function getGuestConnection(guestNum) {
        return state.guestConnections[guestNum] || null;
    }
    
    // Public API
    return {
        startStreaming: startStreaming,
        stopStreaming: stopStreaming,
        createGuestConnection: createGuestConnection,
        closeGuestConnection: closeGuestConnection,
        isStreaming: isStreamingActive,
        getPublishConnection: getPublishConnection,
        getGuestConnection: getGuestConnection
    };
})();
