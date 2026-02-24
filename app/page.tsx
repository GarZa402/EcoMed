import { createClient } from "@/lib/supabase/server";
import HomeClient from "@/components/HomeClient";
import type { Reporte } from "@/components/MapaPrincipal";

export default async function HomePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reportes")
    .select("id, lat, lng, descripcion, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando reportes:", error.message);
  }

  const reportes: Reporte[] = data ?? [];

  return <HomeClient reportes={reportes} />;
}