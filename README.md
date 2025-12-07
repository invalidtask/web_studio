# Web Studio - Browser-Based Streaming Platform

A browser-based streaming studio built with PHP 5.6, jQuery, and CSS. Stream your webcam with multiple guests to an OSSRS server using WebRTC.

## Features

### 1. Layout Selector
Switch between 5 different visual layouts for your stream:
- **Single**: Full-screen single video
- **Picture-in-Picture (PIP)**: Main video with small overlay
- **Split 2**: Side-by-side two-person layout
- **Grid 4**: 2x2 grid for up to 4 participants
- **Grid 5**: Large main video with 4 smaller videos below

### 2. Webcam Selector
- Automatically detects available video input devices
- Dropdown selector to choose your preferred camera
- Start/Stop camera controls

### 3. Remote Guest Support
- Add up to 4 remote guests to your stream
- Each guest is identified by a unique Guest ID
- Real-time visual preview of all participants
- Easy add/remove controls for each guest

### 4. WebRTC Streaming
- Client-side WebRTC implementation
- Streams to OSSRS backend server
- Automatic composite stream generation
- Support for multiple video sources

## Requirements

- PHP 5.6 or higher
- Modern web browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- OSSRS server (for production streaming)

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

## Usage

### Starting Your Camera

1. Select your camera from the **Webcam Selector** dropdown
2. Click **Start Camera** to begin capturing video
3. Your local video will appear in the preview area

### Adding Remote Guests

1. Enter a unique ID for each guest in the guest input fields
2. Click the **Add** button next to the guest
3. The guest's video slot will appear in the preview
4. Repeat for up to 4 guests

### Changing Layouts

1. Click any of the layout buttons in the **Layout Selector** panel
2. The preview will update to show the selected layout
3. Guest slots are automatically arranged based on the layout

### Starting a Stream

1. Configure the **OSSRS Server URL** (default: `rtc://localhost:1985/live/livestream`)
2. Ensure your camera is started and guests are added (if desired)
3. Click **Start Streaming** to begin streaming to the OSSRS server
4. The status indicator will show "Streaming" when active
5. Click **Stop Streaming** to end the stream

## Configuration

### OSSRS Server

The application is configured to work with an OSSRS (Open Source Streaming Server) backend. Update the stream URL in the WebRTC Streaming section:

```
rtc://your-server-ip:1985/live/your-stream-name
```

### Demo Mode

If the OSSRS server is not available, the application runs in demo mode, allowing you to test all features locally without actual streaming.

## Technology Stack

- **PHP 5.6+**: Server-side application hosting
- **jQuery**: DOM manipulation and event handling
- **CSS3**: Modern responsive styling
- **WebRTC**: Real-time video communication
- **HTML5**: Canvas API for composite stream generation

## File Structure

```
web_studio/
├── index.php           # Main application entry point
├── css/
│   └── style.css      # Application styles
├── js/
│   ├── app.js         # Main application logic
│   └── webrtc.js      # WebRTC streaming module
├── lib/
│   ├── jquery-1.12.4.min.js    # jQuery library
│   └── adapter-latest.js        # WebRTC adapter
└── README.md          # This file
```

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Troubleshooting

### No cameras detected
- Ensure your browser has permission to access the camera
- Check if another application is using the camera
- Try refreshing the page

### Streaming fails
- Verify the OSSRS server URL is correct
- Ensure the OSSRS server is running and accessible
- Check browser console for detailed error messages

### Guest videos not showing
- Ensure the selected layout supports the number of guests
- Check that guest IDs are unique
- Verify network connectivity for remote guests

## Development

### Running Tests

Since there's no physical camera in test environments, the application will show an alert. This is expected behavior and the UI will still function for demonstration purposes.

### Adding New Layouts

1. Add a new layout button in `index.php`
2. Define CSS for the layout in `css/style.css`
3. Update the `getMaxGuestsForLayout()` and `composite()` functions in `js/app.js`

## License

MIT License - feel free to use this project for any purpose.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the GitHub repository.