"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type Prodotto = { id: string; nome: string; categoria: string; a_peso: boolean; };
type ElementoCarrello = { prodotto: Prodotto; quantita: number; };

export default function PaginaPubblicaOrdini() {
  const [tab, setTab] = useState<"ordina" | "storico">("ordina");
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [carrello, setCarrello] = useState<ElementoCarrello[]>([]);
  
  // Dati Cliente
  const [nome, setNome] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dataRitiro, setDataRitiro] = useState("");
  const [fascia, setFascia] = useState("Mattina");
  const [ora, setOra] = useState("");
  const [note, setNote] = useState("");

  // Storico
  const [telefonoStorico, setTelefonoStorico] = useState("");
  const [ordiniStorico, setOrdiniStorico] = useState<any[]>([]);
  const [loadingStorico, setLoadingStorico] = useState(false);

  const categorie = ["Pane", "Pizzeria", "Colazione", "Primi Piatti", "Rosticceria", "Dolci", "Focaccia"];

  useEffect(() => {
    const fetchProdotti = async () => {
      const { data } = await supabase.from("prodotti").select("*").eq("attivo", true);
      if (data) setProdotti(data);
    };
    fetchProdotti();
  }, []);

  const aggiungiAlCarrello = (p: Prodotto, q: number) => {
    setCarrello(prev => {
      const es = prev.find(i => i.prodotto.id === p.id);
      if (es) return prev.map(i => i.prodotto.id === p.id ? { ...i, quantita: i.quantita + q } : i);
      return [...prev, { prodotto: p, quantita: q }];
    });
  };

  const inviaOrdine = async () => {
    if (!nome || !telefono || !dataRitiro || !ora || carrello.length === 0) {
      alert("Completa tutti i campi e aggiungi almeno un prodotto!");
      return;
    }

    try {
      // 1. Gestione Cliente (Creazione o Recupero)
      let clienteId = null;
      const { data: clienteEsistente } = await supabase.from("clienti").select("id").eq("telefono", telefono).single();
      
      if (clienteEsistente) {
        clienteId = clienteEsistente.id;
      } else {
        const { data: nuovo } = await supabase.from("clienti").insert([{ nome_completo: nome, telefono }]).select().single();
        clienteId = nuovo?.id;
      }

      // 2. Creazione Ordine
      const { data: ordine, error } = await supabase.from("ordini").insert([{
        cliente_id: clienteId,
        data_ritiro: dataRitiro,
        fascia_oraria: fascia,
        orario_ritiro: ora,
        note: note,
        dipendente: "Web-Cliente"
      }]).select().single();

      if (error) throw error;

      // 3. Dettagli
      const dettagli = carrello.map(i => ({
        ordine_id: ordine.id,
        prodotto_id: i.prodotto.id,
        quantita: i.quantita
      }));
      await supabase.from("dettagli_ordine").insert(dettagli);

      alert("Ordine inviato con successo! Ti aspettiamo in negozio.");
      setCarrello([]); setNome(""); setTelefono(""); setOra(""); setNote("");
    } catch (e) {
      alert("Errore nell'invio. Riprova tra poco.");
    }
  };

  const cercaStorico = async () => {
    if (!telefonoStorico) return;
    setLoadingStorico(true);
    const { data } = await supabase
      .from("ordini")
      .select(`id, data_ritiro, orario_ritiro, note, dettagli_ordine ( quantita, prodotti ( nome ) ), clienti!inner(telefono)`)
      .eq("clienti.telefono", telefonoStorico)
      .order("data_ritiro", { ascending: false });
    
    if (data) setOrdiniStorico(data);
    setLoadingStorico(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Selettore Tab */}
      <div className="flex bg-white rounded-2xl p-1 shadow-sm border-2 border-[#0F5C35]/10">
        <button onClick={() => setTab("ordina")} className={`flex-1 py-3 rounded-xl font-bold transition ${tab === 'ordina' ? 'bg-[#0F5C35] text-white shadow-md' : 'text-gray-500'}`}>Fai un Ordine</button>
        <button onClick={() => setTab("storico")} className={`flex-1 py-3 rounded-xl font-bold transition ${tab === 'storico' ? 'bg-[#0F5C35] text-white shadow-md' : 'text-gray-500'}`}>I miei Ordini</button>
      </div>

      {tab === "ordina" ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <section className="bg-white p-6 rounded-2xl shadow-lg border-t-8 border-[#FDBE15]">
            <h2 className="text-2xl font-black text-[#0F5C35] mb-4">Scegli i prodotti</h2>
            {categorie.map(cat => {
              const prodCat = prodotti.filter(p => p.categoria === cat);
              if (prodCat.length === 0) return null;
              return (
                <div key={cat} className="mb-6">
                  <h3 className="font-bold text-[#F17329] border-b mb-3 uppercase text-sm tracking-widest">{cat}</h3>
                  <div className="space-y-3">
                    {prodCat.map(p => {
                      const q = carrello.find(i => i.prodotto.id === p.id)?.quantita || 0;
                      return (
                        <div key={p.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-orange-50 transition">
                          <span className="font-semibold text-gray-700">{p.nome}</span>
                          <div className="flex items-center gap-3">
                            {q > 0 && <span className="bg-[#FDBE15] text-[#0F5C35] font-black px-3 py-1 rounded-full text-sm">{q}{p.a_peso ? 'g':'x'}</span>}
                            <button onClick={() => aggiungiAlCarrello(p, p.a_peso ? 100 : 1)} className="bg-[#0F5C35] text-white w-8 h-8 rounded-full font-bold">+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>

          {carrello.length > 0 && (
            <section className="bg-white p-6 rounded-2xl shadow-lg border-t-8 border-[#0F5C35] space-y-4">
              <h2 className="text-xl font-black text-[#0F5C35]">Dati per il ritiro</h2>
              <div className="grid gap-4">
                <input type="text" placeholder="Tuo Nome *" value={nome} onChange={e => setNome(e.target.value)} className="w-full p-3 border-2 rounded-xl outline-none focus:border-[#F17329]" />
                <input type="tel" placeholder="Cellulare *" value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full p-3 border-2 rounded-xl outline-none focus:border-[#F17329]" />
                <div className="flex gap-4">
                  <input type="date" value={dataRitiro} onChange={e => setDataRitiro(e.target.value)} className="flex-1 p-3 border-2 rounded-xl outline-none" />
                  <select value={fascia} onChange={e => setFascia(e.target.value)} className="flex-1 p-3 border-2 rounded-xl outline-none">
                    <option value="Mattina">Mattina</option>
                    <option value="Pomeriggio">Pomeriggio</option>
                  </select>
                </div>
                <input type="time" value={ora} onChange={e => setOra(e.target.value)} className="w-full p-3 border-2 rounded-xl outline-none" />
                <textarea placeholder="Note particolari (es. intolleranze o gusti)..." value={note} onChange={e => setNote(e.target.value)} className="w-full p-3 border-2 rounded-xl outline-none h-20" />
                <button onClick={inviaOrdine} className="w-full bg-[#F17329] text-white font-black py-4 rounded-2xl text-lg shadow-lg hover:scale-[1.02] transition">Invia Ordine</button>
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-6 rounded-2xl shadow-lg border-t-8 border-[#0F5C35]">
            <h2 className="text-xl font-bold mb-4">Inserisci il tuo numero per vedere i tuoi ordini</h2>
            <div className="flex gap-2">
              <input type="tel" value={telefonoStorico} onChange={e => setTelefonoStorico(e.target.value)} placeholder="Esempio: 3331234567" className="flex-1 p-3 border-2 rounded-xl outline-none" />
              <button onClick={cercaStorico} className="bg-[#0F5C35] text-white px-6 rounded-xl font-bold">Cerca</button>
            </div>
          </div>

          <div className="space-y-4">
            {loadingStorico ? <p className="text-center animate-pulse">Cercando i tuoi ordini...</p> : 
              ordiniStorico.map(o => (
                <div key={o.id} className="bg-white p-5 rounded-2xl shadow border-l-8 border-[#FDBE15]">
                  <div className="flex justify-between font-bold text-[#0F5C35] mb-2">
                    <span>{new Date(o.data_ritiro).toLocaleDateString('it-IT')}</span>
                    <span>ore {o.orario_ritiro}</span>
                  </div>
                  <ul className="text-sm text-gray-600 mb-2">
                    {o.dettagli_ordine.map((d: any, idx: number) => (
                      <li key={idx}>• {d.quantita} {d.prodotti.nome}</li>
                    ))}
                  </ul>
                  {o.note && <p className="text-xs bg-gray-50 p-2 rounded italic text-gray-500">Nota: {o.note}</p>}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}