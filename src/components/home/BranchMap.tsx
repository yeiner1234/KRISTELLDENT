import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

interface BranchMapProps {
  name: string;
  visibleAddress: string;
  lat: number;
  lng: number;
}

const markerIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: #0f7b86;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(18,35,43,0.3);
    "></div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -26],
});

function BranchMap({ name, visibleAddress, lat, lng }: BranchMapProps) {
  return (
    <div className="h-[220px] w-full">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={markerIcon}>
          <Popup>
            <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, lineHeight: 1.5, color: '#12232b' }}>
              <strong>KristellDent</strong>
              <br />
              Sucursal {name}
              <br />
              {visibleAddress}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default BranchMap;
