import { useState } from "react";
import {
  APIProvider,
  Map,
  Marker,
  InfoWindow,
} from "@vis.gl/react-google-maps";

const markers = [
  { lat: 53.54, lng: 10, label: "Hamburg" },
  { lat: 40.7128, lng: -74.006, label: "New York" },
];

function App() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <div style={{ width: "100vw", height: "100vh" }}>
        <Map
          zoom={3}
          center={{ lat: 20, lng: 0 }}
          mapId="" // leave empty since we’re not using AdvancedMarker
        >
          {markers.map((marker, index) => (
            <Marker
              key={index}
              position={{ lat: marker.lat, lng: marker.lng }}
              onClick={() => setOpenIndex(index)}
            />
          ))}

          {openIndex !== null && (
            <InfoWindow
              position={{
                lat: markers[openIndex].lat,
                lng: markers[openIndex].lng,
              }}
              onCloseClick={() => setOpenIndex(null)}
            >
              <p>{markers[openIndex].label}</p>
            </InfoWindow>
          )}
        </Map>
      </div>
    </APIProvider>
  );
}

export default App;
