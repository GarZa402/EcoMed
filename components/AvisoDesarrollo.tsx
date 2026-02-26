"use client";
import { useState, useEffect } from "react";

const SESSION_KEY = "ecomed_aviso_session";

export default function AvisoDesarrollo() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const visto = sessionStorage.getItem(SESSION_KEY);
    if (visto) return;
    setVisible(true);
    sessionStorage.setItem(SESSION_KEY, "true");
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">

        {/* Ícono */}
        <div className="text-4xl mb-4">🚧</div>

        {/* Título */}
        <h2 className="text-gray-900 font-bold text-xl mb-3 tracking-tight">
          App en desarrollo
        </h2>

        {/* Mensaje */}
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          EcoMed está en fase de pruebas. Es posible que encuentres fallos,
          comportamientos inesperados o funciones incompletas.
          <br /><br />
          Si algo no funciona como esperabas, tu paciencia es muy valiosa para nosotros.
        </p>

        {/* Botón */}
        <button
          onClick={() => setVisible(false)}
          className="w-full bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold py-3 rounded-xl transition"
        >
          Entendido, continuar
        </button>
      </div>
    </div>
  );
}