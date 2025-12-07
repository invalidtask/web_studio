/*!
 * WebRTC Adapter Shim
 * Provides basic browser compatibility for WebRTC
 */
(function(window) {
    'use strict';
    
    // Ensure navigator.mediaDevices exists
    if (typeof navigator.mediaDevices === 'undefined') {
        navigator.mediaDevices = {};
    }
    
    // Polyfill getUserMedia
    if (typeof navigator.mediaDevices.getUserMedia === 'undefined') {
        navigator.mediaDevices.getUserMedia = function(constraints) {
            var getUserMedia = navigator.getUserMedia || 
                               navigator.webkitGetUserMedia || 
                               navigator.mozGetUserMedia || 
                               navigator.msGetUserMedia;
            
            if (!getUserMedia) {
                return Promise.reject(new Error('getUserMedia is not supported'));
            }
            
            return new Promise(function(resolve, reject) {
                getUserMedia.call(navigator, constraints, resolve, reject);
            });
        };
    }
    
    // Polyfill enumerateDevices
    if (typeof navigator.mediaDevices.enumerateDevices === 'undefined') {
        navigator.mediaDevices.enumerateDevices = function() {
            return Promise.resolve([]);
        };
    }
    
    // Ensure RTCPeerConnection exists
    window.RTCPeerConnection = window.RTCPeerConnection || 
                               window.webkitRTCPeerConnection || 
                               window.mozRTCPeerConnection;
    
    // Ensure RTCSessionDescription exists
    window.RTCSessionDescription = window.RTCSessionDescription || 
                                   window.webkitRTCSessionDescription || 
                                   window.mozRTCSessionDescription;
    
    // Ensure RTCIceCandidate exists
    window.RTCIceCandidate = window.RTCIceCandidate || 
                             window.webkitRTCIceCandidate || 
                             window.mozRTCIceCandidate;
    
    console.log('WebRTC adapter loaded');
    
})(window);
