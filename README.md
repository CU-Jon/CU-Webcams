# Clemson University Webcam Rotation System

A fullscreen webcam rotation display that dynamically loads and cycles through live camera feeds from Clemson University's campus. Perfect for office displays, lobby screens, or anyone wanting to enjoy rotating views of the beautiful Clemson campus.

## ✨ Features

- **Dynamic Camera Loading**: Automatically fetches live camera data from Clemson's webcam system
- **Fullscreen Display**: Immersive fullscreen experience with professional branding
- **Auto-Rotation**: Cycles through cameras every 15 seconds with visual progress indicator
- **Randomization**: Optional randomized camera order for variety
- **Auto-Refresh**: Self-healing system that automatically refreshes on network errors
- **Manual Controls**: Play/pause, next camera, and fullscreen toggle
- **Keyboard Shortcuts**: Space (play/pause), arrow keys (navigation), F (fullscreen)
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Accessibility**: Screen reader friendly with ARIA labels and skip links
- **Clemson Branding**: Official university colors and Trade Gothic Next typography

## 🚀 Quick Start

1. **Clone or download** this repository
2. **Open `index.html`** in any modern web browser
3. **Enjoy** the rotating Clemson campus views!

No installation, dependencies, or server setup required - just open and run!

## 🖥️ Perfect for Office Displays

This system is designed to run unattended on office displays:
- **Auto-refresh** recovers from network issues automatically
- **No intervention required** - set it and forget it
- **Professional appearance** with Clemson University branding
- **Stable operation** with hourly camera list refreshes

## 📱 Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## ⚙️ Configuration

The system includes several configurable options in `webcam-rotation.js`:

```javascript
this.config = {
    rotationTime: 15000,        // Time per camera (15 seconds)
    refreshRate: 500,           // Image refresh rate (0.5 seconds)
    randomizeOrder: true,       // Randomize camera order
    autoRefreshOnError: true,   // Auto-refresh on errors
    autoRefreshDelay: 10000,    // Delay before auto-refresh (10 seconds)
    listRefreshInterval: 3600000 // Update camera list every hour
};
```

## 🎮 Controls

### Mouse/Touch Controls
- **Play/Pause Button**: Stop or resume automatic rotation
- **Next Button**: Skip to next camera
- **Fullscreen Button**: Toggle fullscreen mode

### Keyboard Shortcuts
- **Spacebar**: Play/pause rotation
- **Right/Down Arrow**: Next camera
- **Left/Up Arrow**: Previous camera
- **F**: Toggle fullscreen
- **Escape**: Exit fullscreen

## 🏗️ Technical Details

### Architecture
- **Vanilla JavaScript ES6+**: No frameworks or dependencies
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **HTML5**: Semantic markup with accessibility features
- **Font Awesome 6.4.0**: Professional icons
- **Adobe Typekit**: Official Clemson university fonts

### Data Source
Dynamically fetches camera data from:
- Primary: `https://www.clemson.edu/webcams/webcams.js`
- Fallback: CORS proxy for reliability

### Error Handling
- **Retry Logic**: Automatic retry on failed image loads
- **Graceful Degradation**: Continues operation even if some cameras fail
- **Auto-Recovery**: Page refresh on critical failures
- **User Feedback**: Clear error messages and loading states

## 📁 File Structure

```
ccit-webcams/
├── index.html              # Main HTML file
├── webcam-rotation.js      # Core application logic
├── styles.css              # Styling and Clemson branding
└── README.md               # This file
```

## 🎨 Customization

### Colors
Clemson brand colors are defined as CSS custom properties in `styles.css`:
```css
:root {
    --clemson-orange: #F56600;
    --clemson-purple: #522D80;
    --clemson-dark-purple: #2E1A47;
    --clemson-white: #FFFFFF;
}
```

### Typography
Uses official Clemson Trade Gothic Next font with fallbacks:
```css
--font-family: 'Trade Gothic Next', Verdana, 'Franklin Gothic', Arial, sans-serif;
```

### Timing
Adjust rotation and refresh timing in the JavaScript config object.

## 🔧 Development

### Local Development
Simply open `index.html` in a web browser. No build process required.

### Testing
Test on multiple browsers and devices to ensure compatibility.

### Deployment
Upload files to any web server or use GitHub Pages for free hosting.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🎓 About Clemson University

Clemson University is a public research university in Clemson, South Carolina. Founded in 1889, Clemson is known for its beautiful campus, strong academic programs, and vibrant campus life.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Ideas for Contributions
- Additional camera sources
- Enhanced error handling
- Mobile app version
- Additional display modes
- Performance optimizations

## 📞 Support

If you encounter any issues or have questions:
1. Check the browser console for error messages
2. Ensure you have a stable internet connection
3. Try refreshing the page
4. Open an issue on GitHub for bug reports or feature requests

## 🌟 Acknowledgments

- Clemson University for providing the webcam feeds
- Font Awesome for the beautiful icons
- Adobe Typekit for the official Clemson fonts

---

**Go Tigers! 🐅**

*Enjoy your virtual tour of the beautiful Clemson University campus!*