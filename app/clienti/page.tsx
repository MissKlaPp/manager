"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type Cliente = {
  id: string;
  nome_completo: string;
  telefono: string;
  ordini_totali: number;
  creato_il: string;
};

export default function GestioneClienti() {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [ricerca, setRicerca] = useState("");
  const [loading, setLoading] = useState(true);

  // Carica i clienti dal database
  const fetchClienti = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clienti")
      .select("*")
      // Ordiniamo la lista per mostrare prima i clienti più fedeli
      .order("ordini_totali", { ascending: false });

    if (error) {
      console.error("Errore nel caricamento clienti:", error);
    } else {
      setClienti(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClienti();
  }, []);

  // Filtra i clienti in base alla barra di ricerca (per nome o telefono)
  const clientiFiltrati = clienti.filter(
    (cliente) =>
      cliente.nome_completo.toLowerCase().includes(ricerca.toLowerCase()) ||
      cliente.telefono.includes(ricerca)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestione Clienti</h1>
          <p className="text-gray-500 mt-1">
            Hai <span className="font-bold text-[#F17329]">{clienti.length}</span> clienti registrati.
          </p>
        </div>
        
        {/* Barra di ricerca */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="🔍 Cerca nome o telefono..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-lg">Caricamento rubrica in corso...</p>
      ) : clienti.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border text-center">
          <p className="text-xl text-gray-500">Nessun cliente registrato al momento.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Intestazione Tabella (Visibile su schermi grandi) */}
          <div className="hidden md:grid grid-cols-4 bg-gray-50 p-4 border-b text-sm font-bold text-gray-600">
            <div className="col-span-2">Cliente</div>
            <div>Telefono</div>
            <div className="text-center">Ordini Effettuati</div>
          </div>

          {/* Lista Clienti */}
          <div className="divide-y">
            {clientiFiltrati.map((cliente) => (
              <div key={cliente.id} className="grid grid-cols-1 md:grid-cols-4 p-4 items-center gap-4 hover:bg-gray-50 transition">
                
                {/* Nome e Badge (se è un cliente fedele) */}
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0F5C35] flex items-center justify-center text-[#F17329] font-bold uppercase">
                    {cliente.nome_completo.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{cliente.nome_completo}</p>
                    {cliente.ordini_totali >= 5 && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 font-bold px-2 py-1 rounded-full">
                        ⭐ Cliente Fedele
                      </span>
                    )}
                  </div>
                </div>

                {/* Telefono */}
                <div className="text-gray-600 font-medium">
                  {cliente.telefono}
                </div>

                {/* Contatore Ordini */}
                <div className="md:text-center flex justify-between md:block items-center">
                  <span className="md:hidden text-gray-500 text-sm">Ordini Totali:</span>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-lg">
                    {cliente.ordini_totali}
                  </span>
                </div>

              </div>
            ))}
            
            {clientiFiltrati.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Nessun cliente trovato con questa ricerca.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}