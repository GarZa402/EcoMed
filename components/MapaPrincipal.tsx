"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import Map, {
  Source,
  Layer,
  ViewStateChangeEvent,
  LayerProps,
  MapMouseEvent,
  Marker,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const BOUNDS_MEDELLIN: [[number, number], [number, number]] = [
  [-75.68, 6.05],
  [-75.25, 6.48],
];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface Reporte {
  id: string;
  lat: number;
  lng: number;
  descripcion: string;
  created_at: string;
  foto_url?: string;
}

type EstiloMapa = "dark" | "standard" | "satellite";

const estilos: Record<EstiloMapa, string> = {
  dark:      "mapbox://styles/mapbox/dark-v11",
  standard:  "mapbox://styles/mapbox/standard",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
};

const siguienteEstilo: Record<EstiloMapa, EstiloMapa> = {
  dark:      "standard",
  standard:  "satellite",
  satellite: "dark",
};

const etiquetas: Record<EstiloMapa, string> = {
  dark:      "🌙 Oscuro",
  standard:  "🗺️ Estándar",
  satellite: "🛰️ Satélite",
};

const heatmapLayer: LayerProps = {
  id: "heatmap",
  type: "heatmap",
  paint: {
    "heatmap-weight":    ["interpolate", ["linear"], ["zoom"], 0, 0.3, 12, 1],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.2, 12, 0.8],
    "heatmap-radius":    ["interpolate", ["linear"], ["zoom"], 0, 10,  12, 25],
    "heatmap-color": [
      "interpolate", ["linear"], ["heatmap-density"],
      0,   "rgba(0,0,0,0)",
      0.1, "#2563eb",
      0.3, "#06b6d4",
      0.5, "#22c55e",
      0.7, "#eab308",
      0.9, "#f97316",
      1.0, "#ef4444",
    ],
    "heatmap-opacity": 0.85,
  },
};

// Intenta obtener ubicación con alta precisión, si falla usa la de red
function obtenerUbicacion(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(); return; }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(), // si falla, no hay fallback — el mapa queda en Medellín
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

interface Props {
  reportes: Reporte[];
  modoSeleccion?: boolean;
  onUbicacionSeleccionada?: (lat: number, lng: number) => void;
}

export default function MapaPrincipal({
  reportes,
  modoSeleccion = false,
  onUbicacionSeleccionada,
}: Props) {
  const [viewState, setViewState] = useState({
    longitude: -75.567,
    latitude: 6.247,
    zoom: 12,
  });

  const [estilo, setEstilo] = useState<EstiloMapa>("dark");
  const [marcador, setMarcador] = useState<{ lat: number; lng: number } | null>(null);
  const [miUbicacion, setMiUbicacion] = useState<{ lat: number; lng: number } | null>(null);

  const onUbicacionRef = useRef(onUbicacionSeleccionada);
  useEffect(() => {
    onUbicacionRef.current = onUbicacionSeleccionada;
  }, [onUbicacionSeleccionada]);

  // Muestra ubicación al cargar la página
  useEffect(() => {
    obtenerUbicacion()
      .then(({ lat, lng }) => {
        setMiUbicacion({ lat, lng });
        setViewState((v) => ({ ...v, latitude: lat, longitude: lng, zoom: 14 }));
      })
      .catch(() => {}); // Si todo falla, el mapa queda centrado en Medellín
  }, []);

  // Cuando el formulario confirma GPS preciso, actualiza la ubicación y pone el pin
  useEffect(() => {
    function handleGPS(e: Event) {
      const { lat, lng } = (e as CustomEvent).detail;
      setMiUbicacion({ lat, lng });
      setMarcador({ lat, lng });
      setViewState((v) => ({ ...v, latitude: lat, longitude: lng, zoom: 16 }));
      onUbicacionRef.current?.(lat, lng);
    }
    window.addEventListener("ubicacion-gps", handleGPS);
    return () => window.removeEventListener("ubicacion-gps", handleGPS);
  }, []);

  // Limpia el pin de reporte al entrar en modo selección manual
  useEffect(() => {
    if (modoSeleccion) setMarcador(null);
  }, [modoSeleccion]);

  const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = useMemo(
    () => ({
      type: "FeatureCollection",
      features: reportes.map((r) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.lng, r.lat] },
        properties: {
          id: r.id,
          descripcion: r.descripcion,
          created_at: r.created_at,
          foto_url: r.foto_url ?? null,
        },
      })),
    }),
    [reportes]
  );

  function handleMapClick(evt: MapMouseEvent) {
    if (!modoSeleccion) return;
    const { lat, lng } = evt.lngLat;
    setMarcador({ lat, lng });
    onUbicacionRef.current?.(lat, lng);
  }

  const pinEsDiferente =
    marcador &&
    !(miUbicacion?.lat === marcador.lat && miUbicacion?.lng === marcador.lng);

  return (
    <div className="relative w-full h-screen">
      <Map
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        cursor={modoSeleccion ? "crosshair" : "auto"}
        mapStyle={estilos[estilo]}
        mapboxAccessToken={MAPBOX_TOKEN}
        maxBounds={BOUNDS_MEDELLIN}
        minZoom={11}  
      >
      

        <Source id="reportes" type="geojson" data={geojson}>
          <Layer {...heatmapLayer} />
        </Source>

        {/* Punto "Tú estás aquí" */}
        {miUbicacion && (
          <Marker latitude={miUbicacion.lat} longitude={miUbicacion.lng}>
            <div className="relative flex items-center justify-center">
              <div className="absolute w-10 h-10 rounded-full bg-blue-400/30 animate-ping" />
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg z-10" />
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow">
                Tú estás aquí
              </div>
            </div>
          </Marker>
        )}

        {/* Pin 📍 solo cuando se marca una ubicación diferente a la del usuario */}
        {/* {pinEsDiferente && (
          <Marker latitude={marcador!.lat} longitude={marcador!.lng}>
            <div className="text-3xl -translate-x-1/2 -translate-y-full drop-shadow-lg">
              📍
            </div>
          </Marker>
        )} */}
      </Map>

      {modoSeleccion && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm z-10 pointer-events-none">
          Haz clic en el mapa para marcar la ubicación
        </div>
      )}

      <div className="absolute bottom-8 left-5 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
        🗑️ {reportes.length} reporte{reportes.length !== 1 ? "s" : ""} activo
        {reportes.length !== 1 ? "s" : ""}
      </div>

      <button
        onClick={() => setEstilo(siguienteEstilo[estilo])}
        className="absolute top-5 right-5 bg-white px-3 py-2 rounded-lg shadow-md text-sm font-semibold z-10 hover:bg-gray-100 transition text-black"
      >
        {etiquetas[siguienteEstilo[estilo]]}
      </button>
    </div>
  );
}