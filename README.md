# Mobile Overture OSM Extractor

A React Native iOS application for extracting road networks from Overture Maps data by drawing polygons on an interactive map.

![React Native](https://img.shields.io/badge/React%20Native-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo-000020?logo=expo)
![iOS](https://img.shields.io/badge/iOS-000000?logo=apple)

## Features

- **Interactive Map Drawing**: Draw polygons by tapping points on the map using Apple Maps
- **Real-time Measurements**: Live area (km²) and perimeter (km) calculations
- **Full Extraction Pipeline**: Backend extraction with WebSocket progress streaming
- **Network Graph Generation**: Convert road segments to NetworkX graphs
- **iOS-style UI**: Native-feeling interface with bottom sheets and smooth animations
- **City Presets**: Quick navigation to major North American cities
- **Geolocation**: Center map on your current location

## Tech Stack

### Mobile
- **React Native** + **Expo** - Cross-platform mobile development
- **react-native-maps** - Native Apple Maps integration
- **Turf.js** - Geospatial calculations
- **Expo FileSystem & Sharing** - File download and sharing

### Backend (Shared with Web)
- **FastAPI** - Python web framework
- **GeoPandas** + **NetworkX** - Geospatial and graph processing
- **WebSocket** - Real-time progress streaming

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or physical iOS device
- Expo Go app (for testing on physical device)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/spacialglaciercom-lab/mobileiosovertureextract.git
cd mobileiosovertureextract
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on iOS:
- Press `i` to open in iOS Simulator
- Scan QR code with Expo Go app for physical device

### Configuration

The app connects to the backend at `wss://striking-reflection-backend.up.railway.app` by default. To use a different backend, update the `DEFAULT_WS_URL` in `src/constants/index.ts`.

## Usage

### Drawing a Polygon

1. Tap the **"Draw Polygon"** button at the bottom of the screen
2. Tap on the map to add vertices (minimum 3 points required)
3. Tap **"Done"** when finished to close the polygon
4. A bottom sheet will appear with polygon statistics

### Navigation

- **Cities Button**: Quick jump to major cities
- **Location Button**: Center on your current location

### Extraction

1. After drawing a polygon, the bottom sheet shows area and perimeter
2. Tap **"Extract & Process"** to start extraction
3. Watch real-time progress:
   - **Downloading**: Fetching road data from Overture S3
   - **Clipping**: Filtering to polygon boundary
   - **Building Graph**: Creating NetworkX graph
   - **Complete**: Ready for download
4. Download GeoJSON or Graph files

### File Types

- **GeoJSON**: Transportation segments in standard GeoJSON format
- **Graph (.gpickle)**: NetworkX graph with nodes and edges

Load in Python:
```python
import networkx as nx

G = nx.read_gpickle("road_network.gpickle")
print(f"Nodes: {G.number_of_nodes()}")
print(f"Edges: {G.number_of_edges()}")
```

## Project Structure

```
mobileiosovertureextract/
├── App.tsx                 # Main application component
├── app.json                # Expo configuration
├── package.json            # Dependencies
├── src/
│   ├── components/         # UI components
│   │   ├── Button.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── MapView.tsx
│   │   ├── MeasurementCard.tsx
│   │   ├── ProgressCard.tsx
│   │   ├── ProgressBar.tsx
│   │   └── CityPicker.tsx
│   ├── services/           # API and WebSocket services
│   │   ├── ApiService.ts
│   │   └── WebSocketService.ts
│   ├── utils/              # Utility functions
│   │   └── geometry.ts
│   ├── constants/          # App constants
│   │   └── index.ts
│   └── types/              # TypeScript types
│       └── index.ts
└── assets/                 # App icons and splash screens
```

## Backend Setup

This app requires the backend from the web version. Clone and deploy:

```bash
git clone https://github.com/spacialglaciercom-lab/webovertureextract.git
```

See the [web version README](https://github.com/spacialglaciercom-lab/webovertureextract) for backend deployment instructions.

## Building for Production

### Development Build

```bash
npx expo start
```

### Standalone Build (iOS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for iOS
eas build --platform ios
```

## API Endpoints

The app communicates with the backend via:

| Endpoint | Type | Description |
|----------|------|-------------|
| `/ws/extract` | WebSocket | Real-time extraction with progress |
| `/extract` | REST | POST extraction (alternative) |
| `/health` | REST | Health check |
| `/geojson/{hash}` | REST | Download GeoJSON |
| `/download/{hash}` | REST | Download Graph |

## Troubleshooting

### Map Not Loading

- Ensure you have internet connectivity
- Check that location permissions are granted

### Location Not Working

- Grant location permissions when prompted
- Test on a physical device for accurate GPS

### Connection Errors

- Verify backend URL in constants
- Check that backend is running and accessible

## Credits

- [Overture Maps Foundation](https://overturemaps.org/) for open road data
- [Apple Maps](https://developer.apple.com/maps/) for native mapping
- [Expo](https://expo.dev/) for React Native tooling

## License

MIT License - see LICENSE file for details.

---

**Note**: This is the mobile iOS version of the [Web Overture Extractor](https://github.com/spacialglaciercom-lab/webovertureextract).
