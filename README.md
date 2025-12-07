# Web Studio - Browser-Based Streaming Platform

A modern, dark-themed browser-based streaming studio built with PHP 5.6, jQuery, and CSS. Features active speaker detection, auto-spotlight mode, and support for up to 4 remote guests via WebRTC.

![Web Studio UI](https://github.com/user-attachments/assets/c1023746-314c-4814-8dab-869737a39bcc)

## Features

### 1. Dark Modern UI
- Sleek dark theme optimized for streaming professionals
- Responsive design that works on desktop and tablet
- Clean, distraction-free interface
- Real-time status indicators

### 2. Multiple Layout Options
Switch between 6 different visual layouts for your stream:
- **Grid 2x2**: 2x2 grid for up to 4 participants (host + 3 guests)
- **3-Up**: Large presenter view with 3 guests below
- **4-Up**: Equal 2x2 grid layout
- **Picture-in-Picture (PIP)**: Main video with small overlay
- **Side-by-Side**: Two-person split screen
- **Spotlight**: Full-screen single participant (active speaker)

### 3. Auto-Spotlight Mode
- Automatically switches to active speaker
- Uses Web Audio API for voice activity detection (VAD)
- Configurable threshold and smoothing
- Visual border indicator on speaking participant
- Real-time audio level visualization

### 4. Device Management
- **Camera Selector**: Choose from available video input devices
- **Microphone Selector**: Select preferred audio input
- Graceful permission handling with user-friendly fallbacks
- Automatic device change detection and list updates
- Support for device hot-plugging

### 5. Active Speaker Detection
- Real-time audio level monitoring for all participants
- Visual indicators (glowing border) on active speaker
- Audio level bars for each participant
- Drives auto-spotlight layout switching
- Configurable VAD threshold (default: 30/100)

### 6. Remote Guest Support
- Add up to 4 remote guests to your stream
- Individual WebRTC peer connections per guest
- Each guest identified by unique Guest ID
- Real-time visual preview of all participants
- Easy add/remove controls for each guest

### 7. WebRTC Streaming
- **Individual Peer Connections**: Separate connection per guest
- **Separate Publishing Connection**: Dedicated connection for mixed output
- **Canvas-based Compositor**: Assembles all layouts into single output
- **Dual Signaling Support**: HTTP and WebSocket endpoints
- **Configurable Endpoints**: Easy to point to your backend
- Automatic fallback to demo mode if backend unavailable

## Requirements

- **PHP 5.6 or higher**: For serving the application
- **Modern web browser**: Chrome 60+, Firefox 55+, Safari 11+, Edge 79+
- **WebRTC support**: Browser must support getUserMedia and RTCPeerConnection
- **HTTPS (production)**: Required for camera/mic access in production
- **Backend Server**: OSSRS or compatible WebRTC signaling server (optional for demo)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/invalidtask/web_studio.git
cd web_studio
```

2. Start the PHP built-in server:
```bash
php -S localhost:8000
```

3. Open your browser and navigate to:
```
http://localhost:8000/index.php
```

4. Allow camera and microphone permissions when prompted

## Configuration

### Signaling Endpoints

The application supports two signaling methods that can be configured in the UI:

#### HTTP Endpoint (Default)
```
http://localhost:1611/api/rtc_publish
```

This endpoint is used for:
- Sending SDP offers
- Receiving SDP answers
- REST-based signaling

Expected request format:
```json
{
  "sdp": "v=0\r\no=...",
  "type": "offer",
  "streamId": "studio_1234567890"
}
```

Expected response format:
```json
{
  "sdp": "v=0\r\no=...",
  "type": "answer"
}
```

#### WebSocket Endpoint (Alternative)
```
ws://localhost:7443/publish
```

This endpoint is used for:
- Real-time bidirectional signaling
- ICE candidate exchange
- Lower latency connection setup

Message format:
```json
// Offer
{"type": "offer", "sdp": "..."}

// Answer
{"type": "answer", "sdp": "..."}

// ICE Candidate
{"type": "ice-candidate", "candidate": {...}}
```

### Configurable Parameters

Edit the `CONFIG` object in `js/app.js` to customize:

```javascript
var CONFIG = {
    // Signaling endpoints
    publishUrl: 'http://localhost:1611/api/rtc_publish',
    websocketUrl: 'ws://localhost:7443/publish',
    
    // Active speaker detection thresholds
    vadThreshold: 30,           // Voice activity detection (0-100)
    vadSmoothingTime: 0.8,      // Analyser smoothing (0-1)
    vadCheckInterval: 100,       // Check interval in ms
    
    // Layout settings
    defaultLayout: 'grid-2x2',
    autoSpotlightEnabled: false,
    
    // Composite canvas settings
    compositeWidth: 1280,
    compositeHeight: 720,
    compositeFPS: 30
};
```

### OSSRS Backend Setup (Optional)

If using OSSRS as your backend:

1. Install and start OSSRS:
```bash
docker run --rm -it -p 1935:1935 -p 1985:1985 -p 8080:8080 \
    ossrs/srs:4 ./objs/srs -c conf/rtc.conf
```

2. Update the publish URL in the UI to match your OSSRS server:
```
http://your-ossrs-server:1985/rtc/v1/publish/
```

3. The application will automatically format requests for OSSRS compatibility

### Demo Mode

If no backend server is configured or available, the application runs in **demo mode**:
- All UI features remain functional
- Mock guest streams are created with colored placeholders
- Audio level detection works with simulated audio
- Perfect for testing and development

## Usage

### Starting Your Camera

1. Select your camera from the **Camera** dropdown in Device Selector
2. (Optional) Select your preferred microphone from the **Microphone** dropdown
3. Click **Start Camera** to begin capturing video
4. Your local video will appear in the preview area with "Host (You)" label
5. Audio level indicator will appear at the bottom of your video

### Adding Remote Guests

1. Enter a unique ID for each guest in the guest input fields (e.g., "guest_john")
2. Click the **Add** button next to the guest
3. The guest's video slot will appear in the preview
4. In production, this would establish a WebRTC peer connection
5. Repeat for up to 4 guests

**Note**: In demo mode, colored placeholder videos are shown for guests

### Changing Layouts

#### Manual Layout Selection
1. Click any of the 6 layout buttons in the **Layout Selector** panel
2. The preview will update to show the selected layout
3. Guest slots are automatically arranged based on the layout
4. Some layouts support fewer guests (e.g., Side-by-Side: 1 guest, Grid 2x2: 3 guests)

#### Auto-Spotlight Mode
1. Check the **Auto-Spotlight Mode** checkbox
2. The layout will automatically switch to show only the active speaker
3. Speaking participant is detected using real-time audio analysis
4. Visual border glows blue on the speaking participant
5. Uncheck to return to manual layout control

### Active Speaker Detection

The application continuously monitors audio levels:
- **Visual Indicator**: Blue glowing border around speaking participant
- **Audio Bars**: Real-time audio level visualization at bottom of each video
- **Threshold**: Configurable (default 30/100) to filter out background noise
- **Smoothing**: Prevents rapid switching between speakers

### Starting a Stream

1. Configure the **Publish URL (HTTP)** if needed (default: `http://localhost:1611/api/rtc_publish`)
2. Configure the **WebSocket URL** if needed (default: `ws://localhost:7443/publish`)
3. Ensure your camera is started
4. Add guests if desired
5. Click **Start Streaming** to begin streaming to the backend
6. The status indicator will show "Streaming" when active
7. Click **Stop Streaming** to end the stream

### Understanding the Compositor

When streaming with multiple participants:
- All video sources are combined into a single composite stream
- The compositor uses HTML5 Canvas to merge videos
- Layout is rendered at 1280x720 @ 30fps (configurable)
- Only visible participants in current layout are included
- Composite stream is sent via the publishing WebRTC connection

## Architecture

### File Structure

```
web_studio/
├── index.php              # Main application entry point (PHP 5.6)
├── css/
│   └── style.css         # Dark modern theme and layout styles
├── js/
│   ├── app.js            # Main application logic with VAD and compositor
│   └── webrtc.js         # WebRTC module for signaling and connections
├── lib/
│   ├── jquery-1.12.4.min.js    # jQuery library
│   └── adapter-latest.js        # WebRTC adapter for cross-browser support
└── README.md             # This file
```

### Component Overview

#### Frontend (index.php)
- PHP 5.6 compatible HTML generation
- Dark themed UI with modern styling
- Layout selector with 6 options
- Device selectors for camera and microphone
- Guest management controls
- Streaming configuration inputs

#### Application Logic (app.js)
- **Device Management**: Enumerates and handles media devices
- **Audio Analysis**: Web Audio API integration for VAD
- **Active Speaker Detection**: Real-time audio level monitoring
- **Layout Management**: Dynamic layout switching and composition
- **Guest Management**: WebRTC peer connections per guest
- **Compositor**: Canvas-based video mixing
- **Auto-Spotlight**: Automatic layout switching based on speaker

#### WebRTC Module (webrtc.js)
- **Dual Signaling**: HTTP and WebSocket support
- **Individual Connections**: Separate peer per guest
- **Publishing Connection**: Dedicated connection for output
- **ICE Handling**: STUN/TURN server configuration
- **Fallback Logic**: Graceful degradation to demo mode

### Data Flow

```
1. User starts camera
   → getUserMedia() → Local stream → Video element
   → Audio analyser setup → VAD checking starts

2. User adds guest
   → Create RTCPeerConnection
   → Exchange SDP via signaling server
   → Receive guest stream → Guest video element
   → Setup audio analyser for guest

3. Active speaker detection
   → Analyze audio levels (100ms intervals)
   → Identify participant above threshold
   → Update UI indicators (border glow)
   → If auto-spotlight: switch layout

4. User starts streaming
   → Create composite canvas
   → Draw current layout to canvas @ 30fps
   → Capture canvas stream
   → Create publishing RTCPeerConnection
   → Send composite stream to backend
```

### WebRTC Signaling Flow

#### HTTP-based Signaling
```
Client                          Server
  |                               |
  |---(POST) SDP Offer---------->|
  |                               |
  |<--(200) SDP Answer-----------|
  |                               |
  |---(ICE gathering)----------->|
  |                               |
  |<--(Connection established)---|
```

#### WebSocket-based Signaling
```
Client                          Server
  |                               |
  |---(WS Connect)-------------->|
  |<--(WS Connected)-------------|
  |                               |
  |---(offer)------------------->|
  |<--(answer)-------------------|
  |                               |
  |<--(ice-candidate)----------->|
  |---(ice-candidate)----------->|
  |                               |
  |<--(Connection established)---|
```

## Technology Stack

- **PHP 5.6+**: Server-side application hosting
- **jQuery 1.12.4**: DOM manipulation and event handling
- **CSS3**: Modern dark theme with responsive design
- **WebRTC**: Real-time video/audio communication
  - RTCPeerConnection for peer connections
  - getUserMedia for camera/mic access
  - MediaStream API for stream handling
- **Web Audio API**: Active speaker detection
  - AnalyserNode for frequency analysis
  - MediaStreamSource for audio processing
- **HTML5 Canvas**: Composite stream generation
  - 2D rendering context for video mixing
  - captureStream() for output generation

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Basic functionality | 60+ | 55+ | 11+ | 79+ |
| getUserMedia | ✓ | ✓ | ✓ | ✓ |
| WebRTC | ✓ | ✓ | ✓ | ✓ |
| Web Audio API | ✓ | ✓ | ✓ | ✓ |
| Canvas capture | ✓ | ✓ | 11+ | ✓ |
| Device enumeration | ✓ | ✓ | 11+ | ✓ |

**Note**: HTTPS is required for camera/microphone access in production environments.

## Troubleshooting

### No cameras/microphones detected
- **Cause**: Browser permission denied or no devices connected
- **Solution**: 
  - Grant camera/microphone permissions when prompted
  - Check if devices are properly connected
  - Try refreshing the page
  - Check browser settings (chrome://settings/content)
  - The app will show a fallback message and continue to work in demo mode

### Camera won't start
- **Cause**: Device in use by another application or permission issue
- **Solution**:
  - Close other applications using the camera (Zoom, Teams, etc.)
  - Check browser console for detailed error messages
  - Try selecting a different camera
  - Restart the browser

### Streaming fails to connect
- **Cause**: Backend server not running or incorrect URL
- **Solution**:
  - Verify the Publish URL is correct
  - Ensure the backend server is running and accessible
  - Check browser console for detailed error messages
  - The app will fall back to demo mode automatically
  - Check firewall settings

### Guest videos not showing
- **Cause**: Demo mode or layout capacity
- **Solution**:
  - In demo mode, colored placeholders are shown (this is expected)
  - Ensure the selected layout supports the number of guests
  - Some layouts have guest limits (PIP: 1, Side-by-Side: 1, Grid 2x2: 3)
  - Check that guest IDs are unique

### Active speaker detection not working
- **Cause**: No audio track or audio level too low
- **Solution**:
  - Ensure microphone is selected and working
  - Check microphone input level in system settings
  - Adjust `vadThreshold` in CONFIG (lower = more sensitive)
  - Speak louder or closer to microphone
  - Check browser console for Web Audio API errors

### Auto-spotlight mode stuck
- **Cause**: All participants silent or threshold too high
- **Solution**:
  - Uncheck Auto-Spotlight Mode to regain manual control
  - Lower the `vadThreshold` in CONFIG
  - Ensure at least one participant is speaking

### Performance issues / stuttering video
- **Cause**: CPU overload from multiple video streams
- **Solution**:
  - Close unnecessary browser tabs
  - Reduce number of active guests
  - Lower composite resolution in CONFIG
  - Use hardware acceleration in browser settings
  - Close other CPU-intensive applications

## Development

### Running Locally

```bash
# Start PHP development server
php -S localhost:8000

# Open in browser
open http://localhost:8000/index.php
```

### Testing Without Camera

The application gracefully handles missing camera/microphone:
- Shows appropriate warning messages
- Continues to function with UI controls
- Guest management still works in demo mode
- Perfect for development and testing

### Modifying Layouts

To add a new layout:

1. **Add button in index.php**:
```html
<button class="layout-btn" data-layout="custom">
    <div class="layout-preview layout-custom"></div>
    <span>Custom</span>
</button>
```

2. **Add CSS for preview in css/style.css**:
```css
.layout-custom {
    background: /* your preview design */;
}
```

3. **Add layout grid in css/style.css**:
```css
.video-container.layout-custom {
    grid-template-columns: /* your grid */;
    grid-template-rows: /* your grid */;
}
```

4. **Add compositor function in js/app.js**:
```javascript
function drawCustom(ctx, canvas) {
    // Your drawing logic
    drawVideo(ctx, 'local-video', x, y, w, h);
    // ...
}
```

5. **Update switch statement in drawLayoutComposite()**:
```javascript
case 'custom':
    drawCustom(ctx, canvas);
    break;
```

6. **Update getMaxGuestsForLayout()**:
```javascript
var maxGuests = {
    // ...
    'custom': 2  // Your max guest count
};
```

### Customizing VAD Parameters

Edit `CONFIG` in `js/app.js`:

```javascript
var CONFIG = {
    vadThreshold: 30,         // 0-100, higher = less sensitive
    vadSmoothingTime: 0.8,    // 0-1, higher = more smoothing
    vadCheckInterval: 100     // ms, how often to check
};
```

**Tuning tips**:
- **Noisy environment**: Increase threshold (40-50)
- **Quiet environment**: Decrease threshold (15-25)
- **Rapid switching**: Increase smoothing (0.9)
- **Slow response**: Decrease smoothing (0.5-0.7)

### Backend Integration

To integrate with a real WebRTC backend:

1. **HTTP Endpoint**: Implement POST handler at `/api/rtc_publish`
   - Accept JSON with `sdp`, `type`, `streamId`
   - Return JSON with `sdp` (answer)

2. **WebSocket Endpoint**: Implement WebSocket server at `/publish`
   - Handle `offer`, `answer`, `ice-candidate` messages
   - Relay between clients

3. **Guest Connections**: Implement similar endpoints for guest signaling
   - Each guest needs separate signaling path
   - Use guest IDs to route connections

Example OSSRS-compatible format:
```javascript
// Request
{
    "api": "http://server/rtc/v1/publish/",
    "streamurl": "rtc://server/app/stream",
    "sdp": "v=0...",
    "tid": "random-id"
}

// Response  
{
    "code": 0,
    "sdp": "v=0...",
    "sessionid": "session-id"
}
```

## Advanced Configuration

### Changing Composite Resolution

Edit `CONFIG` in `js/app.js`:

```javascript
var CONFIG = {
    compositeWidth: 1920,   // HD: 1920, FHD: 1920
    compositeHeight: 1080,  // HD: 1080, FHD: 1080
    compositeFPS: 30        // 24, 30, or 60
};
```

**Note**: Higher resolution requires more CPU/bandwidth.

### Custom ICE Servers

Edit `CONFIG` in `js/webrtc.js`:

```javascript
var CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:your-turn-server.com', 
          username: 'user', 
          credential: 'pass' }
    ]
};
```

### Disable Demo Mode Fallback

In `js/webrtc.js`, remove the fallback in `sendOfferToServer()`:

```javascript
error: function(xhr, status, error) {
    // Remove the resolve() call and only reject:
    reject(new Error('Failed to connect to server: ' + error));
}
```

## Security Considerations

- **HTTPS Required**: Camera/mic access requires HTTPS in production
- **Permission Handling**: Always check for user permission denial
- **Input Validation**: Validate guest IDs before use
- **CSP Headers**: Consider Content Security Policy for production
- **CORS**: Configure backend CORS for cross-origin requests
- **Rate Limiting**: Implement on backend to prevent abuse

## Performance Tips

1. **Limit Active Guests**: More guests = more CPU usage
2. **Lower Resolution**: Use 720p instead of 1080p if possible
3. **Reduce FPS**: 24fps may be sufficient for talking heads
4. **Hardware Acceleration**: Enable in browser settings
5. **Close Unused Tabs**: Browser resource management
6. **Monitor CPU**: Use browser DevTools Performance tab

## License

MIT License - feel free to use this project for any purpose.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

- Follow existing code style (ES5 for compatibility)
- Test on multiple browsers
- Update README for new features
- Comment complex logic
- Maintain PHP 5.6 compatibility

## Support

For issues and questions, please open an issue on the GitHub repository.

## Acknowledgments

- **adapter.js**: WebRTC adapter for cross-browser support
- **jQuery**: DOM manipulation library
- **OSSRS**: Open source streaming server inspiration
- **Web Audio API**: For active speaker detection