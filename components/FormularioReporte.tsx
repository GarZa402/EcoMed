"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  onReporteCreado: () => void;
  onModoSeleccionChange: (activo: boolean) => void;
  ubicacionSeleccionada: { lat: number; lng: number } | null;
}

export default function FormularioReporte({
  onReporteCreado,
  onModoSeleccionChange,
  ubicacionSeleccionada,
}: Props) {
  const supabase = createClient();

  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [previsualizacion, setPrevisualizacion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [obteniendoGPS, setObteniendoGPS] = useState(false);
  const [minimizado, setMinimizado] = useState(false);

  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);

  function procesarArchivo(archivo: File) {
    if (archivo.size > 5 * 1024 * 1024) {
      setError("La foto no puede superar 5MB");
      return;
    }
    setFoto(archivo);
    setPrevisualizacion(URL.createObjectURL(archivo));
    setError(null);
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (archivo) procesarArchivo(archivo);
  }

  function limpiarFoto() {
    setFoto(null);
    setPrevisualizacion(null);
    if (inputCamaraRef.current) inputCamaraRef.current.value = "";
    if (inputGaleriaRef.current) inputGaleriaRef.current.value = "";
  }

  function handleCerrar() {
    setAbierto(false);
    setMinimizado(false);
    setDescripcion("");
    limpiarFoto();
    setError(null);
    onModoSeleccionChange(false);
  }

  function activarSeleccionMapa() {
    setMinimizado(true);
    onModoSeleccionChange(true);
  }

  const [ubicacionAnterior, setUbicacionAnterior] = useState<typeof ubicacionSeleccionada>(null);
  if (minimizado && ubicacionSeleccionada && ubicacionSeleccionada !== ubicacionAnterior) {
    setUbicacionAnterior(ubicacionSeleccionada);
    setMinimizado(false);
    onModoSeleccionChange(false);
  }

  async function handleAbrir() {
    setAbierto(true);
    setObteniendoGPS(true);
    setError(null);
    try {
      const coords = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
      window.dispatchEvent(new CustomEvent("ubicacion-gps", { detail: coords }));
    } catch {
      setMinimizado(true);
      onModoSeleccionChange(true);
    } finally {
      setObteniendoGPS(false);
    }
  }

  async function subirFoto(archivo: File): Promise<string> {
    const extension = archivo.name.split(".").pop();
    const nombreArchivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const { error } = await supabase.storage
      .from("reportes-fotos")
      .upload(nombreArchivo, archivo, { contentType: archivo.type });
    if (error) throw new Error(`Error subiendo foto: ${error.message}`);
    const { data } = supabase.storage.from("reportes-fotos").getPublicUrl(nombreArchivo);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ubicacionSeleccionada) {
      setError("No hay ubicación. Usa el botón para marcarla en el mapa.");
      return;
    }
    setCargando(true);
    const { lat, lng } = ubicacionSeleccionada;
    try {
      let foto_url: string | null = null;
      if (foto) foto_url = await subirFoto(foto);
      const { error: sbError } = await supabase.from("reportes").insert({
        descripcion, lat, lng,
        ubicacion: `POINT(${lng} ${lat})`,
        foto_url,
      });
      if (sbError) throw new Error(sbError.message);
      handleCerrar();
      onReporteCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      {/* ── Botón principal — SIN fixed, vive en la barra inferior del mapa ── */}
      <button
        onClick={handleAbrir}
        className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold px-5 py-3 rounded-full shadow-lg transition-all text-sm whitespace-nowrap"
      >
        + Reportar basura
      </button>

      {/* ── Pill minimizado — fixed para flotar sobre el mapa mientras se selecciona ── */}
      {abierto && minimizado && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-white rounded-full shadow-xl px-5 py-3 border border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            Haz clic en el mapa para marcar la ubicación
          </span>
          <button
            onClick={() => { setMinimizado(false); onModoSeleccionChange(false); }}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Modal principal — fixed para cubrir toda la pantalla ── */}
      {abierto && !minimizado && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-30 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              🗑️ Reportar acumulación de basura
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  required
                  rows={3}
                  placeholder="Ej: Acumulación de bolsas frente al parque..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-black"
                />
              </div>

              {/* Foto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto <span className="text-gray-400 font-normal">(opcional, máx 5MB)</span>
                </label>
                {previsualizacion ? (
                  <div className="relative">
                    <img
                      src={previsualizacion}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-xl border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={limpiarFoto}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm transition"
                    >✕</button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => inputCamaraRef.current?.click()}
                        className="bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1 rounded-full transition"
                      >📷 Retomar</button>
                      <button
                        type="button"
                        onClick={() => inputGaleriaRef.current?.click()}
                        className="bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1 rounded-full transition"
                      >🖼️ Cambiar</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => inputCamaraRef.current?.click()}
                      className="h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-red-400 hover:text-red-500 transition"
                    >
                      <span className="text-2xl">📷</span>
                      <span className="text-xs font-medium">Tomar foto (Sólo móvil)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => inputGaleriaRef.current?.click()}
                      className="h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-red-400 hover:text-red-500 transition"
                    >
                      <span className="text-2xl">🖼️</span>
                      <span className="text-xs font-medium">Elegir de galería</span>
                    </button>
                  </div>
                )}
                <input ref={inputCamaraRef}  type="file" accept="image/*" capture="environment" onChange={handleFotoChange} className="hidden" />
                <input ref={inputGaleriaRef} type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
              </div>

              {/* Estado de ubicación */}
              {obteniendoGPS ? (
                <div className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg flex items-center gap-2">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Obteniendo ubicación GPS...
                </div>
              ) : ubicacionSeleccionada ? (
                <div className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg flex items-center justify-between">
                  <span>✅ Ubicación lista: {ubicacionSeleccionada.lat.toFixed(5)}, {ubicacionSeleccionada.lng.toFixed(5)}</span>
                  <button type="button" onClick={activarSeleccionMapa} className="ml-2 underline whitespace-nowrap">
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="text-xs bg-yellow-50 text-yellow-700 px-3 py-2 rounded-lg flex items-center justify-between">
                  <span>⚠️ GPS no disponible.</span>
                  <button type="button" onClick={activarSeleccionMapa} className="ml-2 underline font-semibold whitespace-nowrap">
                    Marcar en el mapa
                  </button>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCerrar}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition text-black"
                >Cancelar</button>
                <button
                  type="submit"
                  disabled={cargando || obteniendoGPS}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition disabled:opacity-50 min-w-[120px]"
                >
                  {cargando ? (
                    <span className="flex items-center gap-2 justify-center">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Enviando...
                    </span>
                  ) : "Enviar reporte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}