"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
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
  [-75.85, 5.95],
  [-75.25, 6.55],
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
  dark: "mapbox://styles/mapbox/dark-v11",
  standard: "mapbox://styles/mapbox/standard",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
};

const siguienteEstilo: Record<EstiloMapa, EstiloMapa> = {
  dark: "standard",
  standard: "satellite",
  satellite: "dark",
};

const etiquetas: Record<EstiloMapa, string> = {
  dark: "🌙 Oscuro",
  standard: "🗺️ Estándar",
  satellite: "🛰️ Satélite",
};

const heatmapLayer: LayerProps = {
  id: "heatmap",
  type: "heatmap",
  paint: {
    "heatmap-weight": ["interpolate", ["linear"], ["zoom"], 0, 0.3, 12, 1],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.2, 12, 0.8],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 10, 12, 25],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(0,0,0,0)",
      0.1,
      "#2563eb",
      0.3,
      "#06b6d4",
      0.5,
      "#22c55e",
      0.7,
      "#eab308",
      0.9,
      "#f97316",
      1.0,
      "#ef4444",
    ],
    "heatmap-opacity": 0.85,
  },
};

function obtenerUbicacion(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
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
  const [marcador, setMarcador] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [miUbicacion, setMiUbicacion] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalEcoMed, setModalEcoMed] = useState(false);
  const[modalPrivacidad, setModalPrivacidad] = useState(false);

  const onUbicacionRef = useRef(onUbicacionSeleccionada);
  useEffect(() => {
    onUbicacionRef.current = onUbicacionSeleccionada;
  }, [onUbicacionSeleccionada]);

  useEffect(() => {
    obtenerUbicacion()
      .then(({ lat, lng }) => {
        setMiUbicacion({ lat, lng });
        setViewState((v) => ({
          ...v,
          latitude: lat,
          longitude: lng,
          zoom: 14,
        }));
      })
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    if (modoSeleccion) setMarcador(null);
  }, [modoSeleccion]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuAbierto(false);
        setModalEcoMed(false);
        setModalPrivacidad(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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
    [reportes],
  );

  function handleMapClick(evt: MapMouseEvent) {
    if (menuAbierto) {
      setMenuAbierto(false);
      return;
    }
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

        {pinEsDiferente && (
          <Marker latitude={marcador!.lat} longitude={marcador!.lng}>
            <div className="text-3xl -translate-x-1/2 -translate-y-full drop-shadow-lg">
              📍
            </div>
          </Marker>
        )}
      </Map>

      {/* ── Instrucción modo selección ── */}
      {modoSeleccion && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm z-10 pointer-events-none">
          Haz clic en el mapa para marcar la ubicación
        </div>
      )}

      {/* ── Contador ── */}
      <div className="absolute bottom-8 left-5 bg-black/70 text-white px-4 py-2 rounded-lg text-sm z-10">
        🗑️ {reportes.length} reporte{reportes.length !== 1 ? "s" : ""} activo
        {reportes.length !== 1 ? "s" : ""}
      </div>

      {/* ── Toggle estilo ── */}
      <button
        onClick={() => setEstilo(siguienteEstilo[estilo])}
        className="absolute top-5 right-5 bg-white px-3 py-2 rounded-lg shadow-md text-sm font-semibold z-10 hover:bg-gray-100 transition"
      >
        {etiquetas[siguienteEstilo[estilo]]}
      </button>

      {/* ── Botón hamburguesa ── */}
      <button
        onClick={() => setMenuAbierto(!menuAbierto)}
        className="absolute top-5 left-5 bg-white w-10 h-10 rounded-lg shadow-md z-20 flex flex-col items-center justify-center gap-1.5 hover:bg-gray-100 transition"
        aria-label="Menú"
      >
        <span
          className={`w-5 h-0.5 bg-gray-800 transition-all duration-300 ${menuAbierto ? "rotate-45 translate-y-2" : ""}`}
        />
        <span
          className={`w-5 h-0.5 bg-gray-800 transition-all duration-300 ${menuAbierto ? "opacity-0" : ""}`}
        />
        <span
          className={`w-5 h-0.5 bg-gray-800 transition-all duration-300 ${menuAbierto ? "-rotate-45 -translate-y-2" : ""}`}
        />
      </button>

      {/* ── Menú desplegable ── */}
      {menuAbierto && (
        <>
          {/* Backdrop para cerrar al hacer clic fuera */}
          <div
            className="absolute inset-0 z-10"
            onClick={() => setMenuAbierto(false)}
          />
          <div className="absolute top-16 left-5 z-20 bg-white rounded-xl shadow-xl w-56 overflow-hidden">
            {/* ¿Qué es EcoMed? */}
            <button
              onClick={() => {
                setModalEcoMed(true);
                setMenuAbierto(false);
              }}
              className="w-full text-left px-5 py-4 text-sm font-medium text-gray-800 hover:bg-gray-50 transition flex items-center gap-3"
            >
              <span className="text-lg">🌿</span>
              ¿Qué es EcoMed?
            </button>

            {/* Política de Privacidad */}
            <button
              onClick={() => {
                setModalPrivacidad(true);
                setMenuAbierto(false);
              }}
              className="w-full text-left px-5 py-4 text-sm font-medium text-gray-800 hover:bg-gray-50 transition flex items-center gap-3"
            >
              <span className="text-lg">🔑</span>
              Política de Privacidad
            </button>
            

            <div className="h-px bg-gray-100 mx-4" />

            {/* Iniciar sesión — al fondo del menú */}
            <Link
              href="/admin"
              onClick={() => setMenuAbierto(false)}
              className="w-full text-left px-5 py-4 text-sm font-medium text-gray-500 hover:bg-gray-50 transition flex items-center gap-3"
            >
              <span className="text-lg">🔒</span>
              Iniciar sesión
            </Link>
          </div>
        </>
      )}

      {/* ── Modal ¿Qué es EcoMed? ── */}
      {modalEcoMed && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setModalEcoMed(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cerrar */}
            <button
              onClick={() => setModalEcoMed(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ✕
            </button>

            {/* Ícono */}
            <div className="text-4xl mb-4">🌿</div>

            {/* Título */}
            <h2 className="text-gray-900 font-bold text-xl mb-4 tracking-tight">
              ¿Qué es EcoMed?
            </h2>

            {/* Explicación */}
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              EcoMed es una plataforma ciudadana para reportar acumulaciones de
              basura en Medellín. Cualquier persona puede marcar un punto en el
              mapa y describir el problema.
            </p>

            {/* Impacto */}
            <div className="bg-green-50 rounded-xl px-4 py-4">
              <p className="text-green-800 text-xs font-semibold uppercase tracking-wider mb-2">
                Su impacto
              </p>
              <p className="text-green-700 text-sm leading-relaxed">
                El mapa de calor muestra en tiempo real las zonas con mayor
                concentración de basura, permitiendo identificar puntos críticos
                y apoyar una gestión de residuos más eficiente en la ciudad.
              </p>
            </div>

            <button
              onClick={() => setModalEcoMed(false)}
              className="mt-6 w-full bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold py-3 rounded-xl transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {modalPrivacidad && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setModalPrivacidad(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cerrar */}
            <button
              onClick={() => setModalPrivacidad(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ✕
            </button>

            {/* Ícono */}
            <div className="text-4xl mb-4">🔑</div>

            {/* Título */}
            <h2 className="text-gray-900 font-bold text-xl mb-4 tracking-tight">
              Política de Privacidad
            </h2>

            {/* Explicación */}
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Nuestra Política de Privacidad explica cómo recopilamos, usamos y protegemos
              la información personal de nuestros usuarios. Al utilizar EcoMed, aceptas
              los términos de esta política.
            </p>

            {/* Impacto */}
            <div className="bg-yellow-50 rounded-xl px-4 py-4">
              <p className="text-yellow-800 text-xs font-semibold uppercase tracking-wider mb-2">
                Nuestra Política
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">
                Recopilamos información como tu ubicación geográfica para mostrar
                en el mapa de calor y mejorar la experiencia del usuario. Toda tu información está protegida.
              </p>
            </div>

            <button
              onClick={() => setModalPrivacidad(false)}
              className="mt-6 w-full bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold py-3 rounded-xl transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
