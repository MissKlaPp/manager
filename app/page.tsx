"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient"; // Assicurati di usare l'alias corretto che abbiamo visto

type Prodotto = { id: string; nome: string; categoria: string; };
type ElementoCarrello = { prodotto: Prodotto; quantita: number; };

export default function NuovoOrdine() {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [carrello, setCarrello] = useState<ElementoCarrello[]>([]);
  const [ricerca, setRicerca] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Dati Cliente per il Pop-up
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [dataRitiro, setDataRitiro] = useState("");

  useEffect(() => {
    // Carica solo i prodotti attivi
    const fetchProdotti = async () => {
      const { data } = await supabase.from("prodotti").select("*").eq("attivo", true);
      if (data) setProdotti(data);
    };
    fetchProdotti();
    // Imposta la data di ritiro di default a oggi
    setDataRitiro(new Date().toISOString().split('T')[0]);
  }, []);

  // --- LOGICA CARRELLO ---
  const aggiornaQuantita = (prodotto: Prodotto, delta: number) => {
    setCarrello((prev) => {
      const esistente = prev.find((item) => item.prodotto.id === prodotto.id);
      if (esistente) {
        const nuovaQuantita = esistente.quantita + delta;
        if (nuovaQuantita <= 0) return prev.filter((item) => item.prodotto.id !== prodotto.id);
        return prev.map((item) => item.prodotto.id === prodotto.id ? { ...item, quantita: nuovaQuantita } : item);
      } else if (delta > 0) {
        return [...prev, { prodotto, quantita: 1 }];
      }
      return prev;
    });
  };

  const quantitaNelCarrello = (id: string) => {
    return carrello.find((item) => item.prodotto.id === id)?.quantita || 0;
  };

  // --- LOGICA SALVATAGGIO SU DATABASE ---
  const confermaOrdine = async () => {
    if (!nomeCliente || !telefonoCliente || !dataRitiro) {
      alert("Compila tutti i dati del cliente e la data di ritiro!");
      return;
    }

    try {
      // 1. Gestione Cliente (Esiste già o è nuovo?)
      let clienteId = null;
      const { data: clienteEsistente } = await supabase
        .from("clienti")
        .select("*")
        .eq("telefono", telefonoCliente)
        .single();

      if (clienteEsistente) {
        clienteId = clienteEsistente.id;
        // Incrementa ordini totali
        await supabase.from("clienti").update({ ordini_totali: clienteEsistente.ordini_totali + 1 }).eq("id", clienteId);
      } else {
        // Crea nuovo cliente
        const { data: nuovoCliente, error: errCliente } = await supabase
          .from("clienti")
          .insert([{ nome_completo: nomeCliente, telefono: telefonoCliente }])
          .select()
          .single();
        if (errCliente) throw errCliente;
        clienteId = nuovoCliente.id;
      }

      // 2. Crea l'Ordine Principale
      const { data: nuovoOrdine, error: errOrdine } = await supabase
        .from("ordini")
        .insert([{ cliente_id: clienteId, data_ritiro: dataRitiro }])
        .select()
        .single();
      if (errOrdine) throw errOrdine;

      // 3. Inserisci i dettagli (I prodotti nel carrello)
      const dettagli = carrello.map((item) => ({
        ordine_id: nuovoOrdine.id,
        prodotto_id: item.prodotto.id,
        quantita: item.quantita,
      }));
      const { error: errDettagli } = await supabase.from("dettagli_ordine").insert(dettagli);
      if (errDettagli) throw errDettagli;

      // 4. Se tutto va bene, stampa e resetta
      window.print(); // Apre la finestra di stampa per la stampante termica!
      
      setCarrello([]);
      setShowModal(false);
      setNomeCliente("");
      setTelefonoCliente("");
      alert("Ordine salvato e inviato in stampa!");

    } catch (error) {
      console.error(error);
      alert("Errore durante il salvataggio dell'ordine");
    }
  };

  const prodottiFiltrati = prodotti.filter(p => p.nome.toLowerCase().includes(ricerca.toLowerCase()));

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Nuovo Ordine</h1>
        <input 
          type="text" 
          placeholder="🔍 Cerca prodotto..." 
          className="p-3 border rounded-lg w-64 outline-none focus:ring-2 focus:ring-blue-500"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
        />
      </div>

      {/* Griglia Prodotti */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {prodottiFiltrati.map((prodotto) => (
          <div key={prodotto.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="font-bold text-lg text-gray-800">{prodotto.nome}</h3>
              <p className="text-sm text-gray-500">{prodotto.categoria}</p>
            </div>
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
              <button onClick={() => aggiornaQuantita(prodotto, -1)} className="w-10 h-10 bg-white text-gray-800 font-bold rounded-md border shadow-sm hover:bg-gray-100">-</button>
              <span className="font-bold text-xl">{quantitaNelCarrello(prodotto.id)}</span>
              <button onClick={() => aggiornaQuantita(prodotto, 1)} className="w-10 h-10 bg-blue-600 text-white font-bold rounded-md shadow-sm hover:bg-blue-700">+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Barra inferiore fissa "Procedi" */}
      {carrello.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-between items-center max-w-6xl mx-auto rounded-t-xl">
          <div className="text-lg font-bold">
            Totale pezzi: <span className="text-blue-600">{carrello.reduce((acc, item) => acc + item.quantita, 0)}</span>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition"
          >
            Procedi all'Ordine
          </button>
        </div>
      )}

      {/* POP-UP Recap e Cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 border-b pb-2">Riepilogo Ordine</h2>
            
            <ul className="mb-6 space-y-2">
              {carrello.map((item) => (
                <li key={item.prodotto.id} className="flex justify-between border-b pb-1">
                  <span>{item.quantita}x {item.prodotto.nome}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Nome Cliente</label>
                <input type="text" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} className="w-full p-3 border rounded-lg outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefono</label>
                <input type="tel" value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value)} className="w-full p-3 border rounded-lg outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data Ritiro</label>
                <input type="date" value={dataRitiro} onChange={e => setDataRitiro(e.target.value)} className="w-full p-3 border rounded-lg outline-none" required />
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)} className="w-1/3 bg-gray-200 py-3 rounded-lg font-bold hover:bg-gray-300">Modifica</button>
              <button onClick={confermaOrdine} className="w-2/3 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">Conferma e Stampa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}