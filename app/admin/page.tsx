"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Reporte {
  id: string;
  descripcion: string;
  lat: number;
  lng: number;
  foto_url: string | null;
  created_at: string;
}

export default function AdminPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sesion, setSesion] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [exportando, setExportando] = useState<"csv" | "pdf" | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSesion(true);
        cargarReportes();
      }
      setCargando(false);
    });
  }, []);

  async function cargarReportes() {
    const { data, error } = await supabase
      .from("reportes")
      .select("id, descripcion, lat, lng, foto_url, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      return;
    }
    setReportes(data ?? []);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError("Credenciales incorrectas.");
      setCargando(false);
      return;
    }
    setSesion(true);
    await cargarReportes();
    setCargando(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSesion(false);
    setReportes([]);
  }


  function exportarCSV() {
    setExportando("csv");
    const headers = [
      "ID",
      "Descripción",
      "Latitud",
      "Longitud",
      "Foto",
      "Fecha",
    ];
    const filas = reportes.map((r) => [
      r.id,
      `"${r.descripcion.replace(/"/g, '""')}"`,
      r.lat,
      r.lng,
      r.foto_url ?? "",
      new Date(r.created_at).toLocaleString("es-CO"),
    ]);
    const csv = [headers, ...filas].map((f) => f.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecomed_reportes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportando(null);
  }


  function exportarPDF() {
    setExportando("pdf");

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const fecha = new Date().toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });


    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, 297, 30, "F");


    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("EcoMed — Reporte de acumulaciones de basura", 14, 13);


    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado el ${fecha}  ·  ${reportes.length} reportes`, 14, 22);


    autoTable(doc, {
      startY: 35,
      head: [["#", "Descripción", "Latitud", "Longitud", "Foto", "Fecha"]],
      body: reportes.map((r, i) => [
        i + 1,
        r.descripcion.length > 60
          ? r.descripcion.slice(0, 60) + "…"
          : r.descripcion,
        r.lat.toFixed(5),
        r.lng.toFixed(5),
        r.foto_url ? "Sí" : "—",
        new Date(r.created_at).toLocaleString("es-CO", {
          dateStyle: "short",
          timeStyle: "short",
        }),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [50, 50, 50],
      },
      headStyles: {
        fillColor: [50, 50, 50],
        textColor: [255, 255, 255], 
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 100 },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 25, halign: "center" },
        4: { cellWidth: 15, halign: "center" },
        5: { cellWidth: 40 },
      },
      margin: { left: 14, right: 14 },
    });


    const totalPaginas = (
      doc as jsPDF & { internal: { getNumberOfPages: () => number } }
    ).internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(
        `Página ${i} de ${totalPaginas}  ·  EcoMed`,
        297 / 2,
        doc.internal.pageSize.height - 5,
        { align: "center" },
      );
    }

    doc.save(`ecomed_reportes_${new Date().toISOString().slice(0, 10)}.pdf`);
    setExportando(null);
  }


  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }


  if (!sesion) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm p-8">
          <div className="text-2xl mb-1">🔒</div>
          <h1 className="text-white font-bold text-xl mb-1">
            Panel de administración
          </h1>
          <p className="text-white/40 text-sm mb-8">Solo para uso interno</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">
                Correo
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 transition"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 transition"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm py-3 rounded-lg transition mt-2"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">Panel EcoMed</h1>
          <p className="text-white/40 text-xs">
            {reportes.length} reportes totales
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV */}
          <button
            onClick={exportarCSV}
            disabled={!!exportando || reportes.length === 0}
            className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            {exportando === "csv" ? (
              <>
                <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />{" "}
                CSV...
              </>
            ) : (
              <>⬇️ CSV</>
            )}
          </button>

          {/* PDF */}
          <button
            onClick={exportarPDF}
            disabled={!!exportando || reportes.length === 0}
            className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            {exportando === "pdf" ? (
              <>
                <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />{" "}
                PDF...
              </>
            ) : (
              <>📄 PDF</>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white text-xs transition px-3 py-2 rounded-lg border border-white/10 hover:border-white/30"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="p-6 overflow-x-auto">
        {reportes.length === 0 ? (
          <div className="text-center text-white/30 py-20 text-sm">
            No hay reportes aún
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
                <th className="text-left pb-3 pr-4">#</th>
                <th className="text-left pb-3 pr-4">Fecha</th>
                <th className="text-left pb-3 pr-4">Descripción</th>
                <th className="text-left pb-3 pr-4">Latitud</th>
                <th className="text-left pb-3 pr-4">Longitud</th>
                <th className="text-left pb-3">Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reportes.map((r, i) => (
                <tr key={r.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3 pr-4 text-white/30 text-xs">{i + 1}</td>
                  <td className="py-3 pr-4 text-white/50 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("es-CO", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="py-3 pr-4 text-white/80 max-w-xs">
                    <span className="line-clamp-2">{r.descripcion}</span>
                  </td>
                  <td className="py-3 pr-4 text-white/50 font-mono text-xs">
                    {r.lat.toFixed(5)}
                  </td>
                  <td className="py-3 pr-4 text-white/50 font-mono text-xs">
                    {r.lng.toFixed(5)}
                  </td>
                  <td className="py-3">
                    {r.foto_url ? (
                      <a
                        href={r.foto_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs underline"
                      >
                        Ver foto
                      </a>
                    ) : (
                      <span className="text-white/20 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
