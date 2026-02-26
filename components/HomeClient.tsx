"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import FormularioReporte from "@/components/FormularioReporte";
import type { Reporte } from "@/components/MapaPrincipal";

const MapaPrincipal = dynamic(() => import("@/components/MapaPrincipal"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white text-sm animate-pulse">Cargando mapa...</p>
    </div>
  ),
});

export default function HomeClient({ reportes }: { reportes: Reporte[] }) {
  const router = useRouter();
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  return (
    <main className="relative w-full h-screen overflow-hidden">
      <MapaPrincipal
        reportes={reportes}
        modoSeleccion={modoSeleccion}
        onUbicacionSeleccionada={(lat, lng) => {
          setUbicacionSeleccionada({ lat, lng });
          setModoSeleccion(false);
        }}
        botonReporte={
          // FormularioReporte vive dentro de la barra inferior del mapa
          <FormularioReporte
            onReporteCreado={() => {
              setUbicacionSeleccionada(null);
              router.refresh();
            }}
            onModoSeleccionChange={setModoSeleccion}
            ubicacionSeleccionada={ubicacionSeleccionada}
          />
        }
      />
    </main>
  );
}