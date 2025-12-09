import { useState, useEffect } from "react";
import {Clock, Loader2} from "lucide-react";

const GoogleMapEmbed = ({ address, className = "" }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [userLocation, setUserLocation] = useState(null);
  const [activeTab, setActiveTab] = useState("place");
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (navigator.geolocation && activeTab === "directions") {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      });
    }
  }, [activeTab]);

  useEffect(() => {
    setMapLoaded(false);
  }, [activeTab]);

  let mapUrl = "";
  if (activeTab === "directions") {
    const start = userLocation
      ? `${userLocation.lat},${userLocation.lng}`
      : "Current+Location";
    const destination = encodeURIComponent(address);
    mapUrl = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${start}&destination=${destination}&mode=driving`;
  } else {
    const place = encodeURIComponent(address);
    mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${place}&zoom=18`;
  }

  return (
    <div className={className}>
      <div className="flex mb-2 bg-white/10 rounded-lg p-1 backdrop-blur-sm">
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
            activeTab === "place"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-white/70 hover:text-white hover:bg-white/5"
          }`}
          onClick={() => setActiveTab("place")}
        >
          Location
        </button>

        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
            activeTab === "directions"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-white/70 hover:text-white hover:bg-white/5"
          }`}
          onClick={() => setActiveTab("directions")}
        >
          Directions
        </button>
      </div>
      
      <div className="relative rounded-lg h-55 w-full bg-gray-700/30">
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-800/50 z-10">
            <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
          </div>
        )}

        <iframe
          className="rounded-lg h-55 w-full"
          src={mapUrl}
          onLoad={() => setMapLoaded(true)}
          referrerPolicy="no-referrer-when-downgrade"
          title={activeTab === "directions" ? "Directions to Location" : "Location Map"}
        />
      </div>
    </div>
  );
};

export default GoogleMapEmbed;
