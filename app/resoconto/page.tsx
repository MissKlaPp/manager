"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type Prodotto = { id: string; nome: string; a_peso: boolean };
type Dettaglio = { quantita: number; prodotto_id: string; prodotti: Prodotto | null };
type Ordine = {
  id: string; data_ritiro: string; fascia_oraria: string; orario_ritiro: string; dipendente: string; note: string;
  clienti: { id: string; nome_completo: string; telefono: string } | null;
  dettagli_ordine: Dettaglio[];
};
type ElementoCarrello = { prodotto: Prodotto; quantita: number };

export default function ResocontoGiornaliero() {
  const [ordini, setOrdini] = useState<Ordine[]>([]);
  const [riepilogoMattina, setRiepilogoMattina] = useState<Record<string, { quantita: number, a_peso: boolean }>>({});
  const [riepilogoPomeriggio, setRiepilogoPomeriggio] = useState<Record<string, { quantita: number, a_peso: boolean }>>({});
  
  const [tipoStampa, setTipoStampa] = useState<"Mattina" | "Pomeriggio" | "Singolo" | null>(null);
  const [ordineDaStampare, setOrdineDaStampare] = useState<Ordine | null>(null);

  const [dataFiltro, setDataFiltro] = useState("");
  const [catalogoProdotti, setCatalogoProdotti] = useState<Prodotto[]>([]);

  // STATI PER LA MODIFICA TOTALE DELL'ORDINE
  const [ordineInModifica, setOrdineInModifica] = useState<Ordine | null>(null);
  const [carrelloModifica, setCarrelloModifica] = useState<ElementoCarrello[]>([]);
  const [prodottoDaAggiungere, setProdottoDaAggiungere] = useState("");
  
  const [editNome, setEditNome] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editData, setEditData] = useState("");
  const [editFascia, setEditFascia] = useState("");
  const [editOra, setEditOra] = useState("");
  const [editDipendente, setEditDipendente] = useState("");
  const [editNote, setEditNote] = useState("");

  const listaDipendenti = ["Agnese", "Tatiana", "Giusy", "Carmen", "Lillo", "Domenico", "Mariagrazia"];

  useEffect(() => {
    setDataFiltro(new Date().toISOString().split("T")[0]);
    const fetchCatalogo = async () => {
      const { data } = await supabase.from("prodotti").select("id, nome, a_peso").eq("attivo", true);
      if (data) setCatalogoProdotti(data);
    };
    fetchCatalogo();
  }, []);

  useEffect(() => { if (dataFiltro) fetchOrdini(); }, [dataFiltro]);

  const fetchOrdini = async () => {
    const { data } = await supabase.from("ordini")
      .select(`id, data_ritiro, fascia_oraria, orario_ritiro, dipendente, note, clienti ( id, nome_completo, telefono ), dettagli_ordine ( quantita, prodotto_id, prodotti ( id, nome, a_peso ) )`)
      .eq("data_ritiro", dataFiltro)
      .order("orario_ritiro", { ascending: true });

    if (data) {
      const ordiniFormattati = data as unknown as Ordine[];
      setOrdini(ordiniFormattati);
      calcolaRiepilogo(ordiniFormattati);
    }
  };

  const calcolaRiepilogo = (listaOrdini: Ordine[]) => {
    const totM: Record<string, { quantita: number, a_peso: boolean }> = {};
    const totP: Record<string, { quantita: number, a_peso: boolean }> = {};
    listaOrdini.forEach((o) => {
      const target = o.fascia_oraria === "Pomeriggio" ? totP : totM;
      o.dettagli_ordine.forEach((d) => {
        const nome = d.prodotti?.nome;
        if (nome) {
          if (!target[nome]) target[nome] = { quantita: 0, a_peso: d.prodotti?.a_peso || false };
          target[nome].quantita += d.quantita;
        }
      });
    });
    setRiepilogoMattina(totM);
    setRiepilogoPomeriggio(totP);
  };

  const eliminaOrdine = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare definitivamente questo ordine?")) return;
    const { error } = await supabase.from("ordini").delete().eq("id", id);
    if (!error) fetchOrdini();
  };

  const stampaRiepilogo = (fascia: "Mattina" | "Pomeriggio") => {
    setTipoStampa(fascia);
    setTimeout(() => { window.print(); }, 100);
  };

  const stampaSingoloOrdine = (ordine: Ordine) => {
    setOrdineDaStampare(ordine);
    setTipoStampa("Singolo");
    setTimeout(() => { window.print(); }, 100);
  };

  // FUNZIONE WHATSAPP
  const apriWhatsApp = (telefono: string | undefined, messaggio: string) => {
    if (!telefono) {
      alert("Nessun numero di telefono salvato per questo cliente.");
      return;
    }
    // Rimuove gli spazi e formatta per l'Italia se inizia con 3
    let numStr = telefono.replace(/\D/g, '');
    if (numStr.startsWith('3') && numStr.length <= 10) {
      numStr = '39' + numStr;
    }
    const url = `https://wa.me/${numStr}?text=${encodeURIComponent(messaggio)}`;
    window.open(url, '_blank');
  };

  const apriModifica = (ordine: Ordine) => {
    setOrdineInModifica(ordine);
    // Carica tutti i dati attuali nei campi di modifica
    setEditNome(ordine.clienti?.nome_completo || "");
    setEditTelefono(ordine.clienti?.telefono || "");
    setEditData(ordine.data_ritiro || "");
    setEditFascia(ordine.fascia_oraria || "Mattina");
    setEditOra(ordine.orario_ritiro || "");
    setEditDipendente(ordine.dipendente || "Agnese");
    setEditNote(ordine.note || "");

    const carrelloIniziale = ordine.dettagli_ordine
      .filter(d => d.prodotti !== null)
      .map(d => ({ prodotto: d.prodotti!, quantita: d.quantita }));
    setCarrelloModifica(carrelloIniziale);
  };

  const aggiornaQuantitaModifica = (id: string, delta: number, a_peso: boolean, valoreEsatto?: number) => {
    setCarrelloModifica(prev => prev.map(item => {
      if (item.prodotto.id === id) {
        const nq = a_peso ? (valoreEsatto || 0) : item.quantita + delta;
        return { ...item, quantita: nq };
      }
      return item;
    }).filter(item => item.quantita > 0));
  };

  const aggiungiAOrdine = () => {
    const prod = catalogoProdotti.find(p => p.id === prodottoDaAggiungere);
    if (prod && !carrelloModifica.find(i => i.prodotto.id === prod.id)) {
      setCarrelloModifica([...carrelloModifica, { prodotto: prod, quantita: prod.a_peso ? 100 : 1 }]);
    }
    setProdottoDaAggiungere("");
  };

  const salvaModifiche = async () => {
    if (!ordineInModifica) return;

    try {
      // 1. Aggiorniamo i dati del Cliente
      if (ordineInModifica.clienti?.id) {
        await supabase.from("clienti").update({
          nome_completo: editNome,
          telefono: editTelefono
        }).eq("id", ordineInModifica.clienti.id);
      }

      // 2. Aggiorniamo i dati Generali dell'Ordine
      await supabase.from("ordini").update({
        data_ritiro: editData,
        fascia_oraria: editFascia,
        orario_ritiro: editOra,
        dipendente: editDipendente,
        note: editNote
      }).eq("id", ordineInModifica.id);

      // 3. Aggiorniamo i Prodotti nel Carrello
      await supabase.from("dettagli_ordine").delete().eq("ordine_id", ordineInModifica.id);
      if (carrelloModifica.length > 0) {
        const dettagli = carrelloModifica.map(i => ({ ordine_id: ordineInModifica.id, prodotto_id: i.prodotto.id, quantita: i.quantita }));
        await supabase.from("dettagli_ordine").insert(dettagli);
      } else {
        await supabase.from("ordini").delete().eq("id", ordineInModifica.id);
      }

      setOrdineInModifica(null);
      fetchOrdini();
    } catch (error) {
      alert("Errore durante il salvataggio delle modifiche.");
      console.error(error);
    }
  };

  return (
    <>
      <div className="space-y-8 print:hidden">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Resoconto</h1>
          <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className="p-2 border rounded shadow-sm outline-none focus:ring-2 focus:ring-[#F17329] bg-white" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <div className="flex justify-between items-center mb-4 text-[#0F5C35]">
              <h2 className="font-bold uppercase">Mattina</h2>
              <button onClick={() => stampaRiepilogo("Mattina")} className="bg-[#0F5C35] text-white px-3 py-1 rounded text-sm font-bold shadow-sm">Stampa</button>
            </div>
            <div className="space-y-2">
              {Object.entries(riepilogoMattina).map(([n, i]) => (
                <div key={n} className="flex justify-between bg-white p-2 rounded border text-sm shadow-sm">
                  <span>{n}</span><span className="font-bold text-[#0F5C35]">{i.quantita}{i.a_peso ? "g" : "x"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
            <div className="flex justify-between items-center mb-4 text-[#F17329]">
              <h2 className="font-bold uppercase">Pomeriggio</h2>
              <button onClick={() => stampaRiepilogo("Pomeriggio")} className="bg-[#F17329] text-white px-3 py-1 rounded text-sm font-bold shadow-sm">Stampa</button>
            </div>
            <div className="space-y-2">
              {Object.entries(riepilogoPomeriggio).map(([n, i]) => (
                <div key={n} className="flex justify-between bg-white p-2 rounded border text-sm shadow-sm">
                  <span>{n}</span><span className="font-bold text-[#F17329]">{i.quantita}{i.a_peso ? "g" : "x"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ordini.map((o) => (
            <div key={o.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative hover:border-[#FDBE15] transition flex flex-col justify-between pt-10">
              
              {/* BOTTONI WHATSAPP IN ALTO */}
              <div className="absolute top-3 left-4 flex gap-2">
                <button 
                  onClick={() => apriWhatsApp(o.clienti?.telefono, "Abbiamo avuto un problema con il suo ordine.")} 
                  className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded hover:bg-red-200 transition"
                >
                  ⚠️ Emergenza
                </button>
                <button 
                  onClick={() => apriWhatsApp(o.clienti?.telefono, "Il suo ordine in sospeso non è ancora stato ritirato, ci contatti per ulteriori informazioni.")} 
                  className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded hover:bg-blue-200 transition"
                >
                  💬 Promemoria
                </button>
              </div>

              <div className={`absolute top-3 right-4 font-bold px-2 py-1 rounded-full text-xs ${o.fascia_oraria === 'Mattina' ? 'bg-blue-100 text-[#0F5C35]' : 'bg-orange-100 text-[#F17329]'}`}>
                {o.orario_ritiro}
              </div>
              
              <div>
                <div className="border-b pb-2 mb-2">
                  <h3 className="font-bold uppercase text-gray-800">{o.clienti?.nome_completo || "Sconosciuto"}</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">📝 Gestito da: {o.dipendente}</p>
                </div>
                <ul className="text-sm space-y-1 mb-3">
                  {o.dettagli_ordine.map((d, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{d.prodotti?.nome}</span><span className="font-bold">{d.quantita}{d.prodotti?.a_peso ? "g" : "x"}</span>
                    </li>
                  ))}
                </ul>
                
                {o.note && (
                  <div className="bg-yellow-50 p-2 rounded text-xs font-bold text-yellow-800 border border-yellow-200 mb-3 whitespace-pre-wrap">
                    Nota: {o.note}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 border-t pt-3">
                <button onClick={() => stampaSingoloOrdine(o)} className="text-gray-600 font-bold text-xs uppercase hover:text-black hover:underline flex items-center gap-1">🖨️ Ristampa</button>
                <button onClick={() => apriModifica(o)} className="text-[#0F5C35] font-bold text-xs uppercase hover:underline">Modifica</button>
                <button onClick={() => eliminaOrdine(o.id)} className="text-red-600 font-bold text-xs uppercase hover:underline">Elimina</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POPUP MODIFICA COMPLETA */}
      {ordineInModifica && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[95vh] overflow-y-auto border-t-8 border-[#FDBE15] shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 border-b pb-2 text-[#0F5C35] sticky top-0 bg-white z-10">Modifica Ordine Completa</h2>
            
            <div className="space-y-4 mb-6">
              
              {/* Modifica Cliente e Telefono */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500">Nome Cliente</label>
                  <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)} className="w-full p-2 border rounded bg-gray-50 outline-none focus:border-[#F17329] text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500">Telefono</label>
                  <input type="tel" value={editTelefono} onChange={e => setEditTelefono(e.target.value)} className="w-full p-2 border rounded bg-gray-50 outline-none focus:border-[#F17329] text-sm" />
                </div>
              </div>

              {/* Modifica Data, Fascia e Ora */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500">Data Ritiro</label>
                  <input type="date" value={editData} onChange={e => setEditData(e.target.value)} className="w-full p-2 border rounded bg-gray-50 outline-none focus:border-[#F17329] text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500">Fascia</label>
                  <select value={editFascia} onChange={e => setEditFascia(e.target.value)} className="w-full p-2 border rounded bg-gray-50 outline-none text-sm">
                    <option value="Mattina">Mattina</option>
                    <option value="Pomeriggio">Pomeriggio</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500">Ora</label>
                  <input type="time" value={editOra} onChange={e => setEditOra(e.target.value)} className="w-full p-2 border rounded bg-gray-50 outline-none focus:border-[#F17329] text-sm" />
                </div>
              </div>

              {/* Modifica Dipendente */}
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500">Dipendente al Banco</label>
                <select value={editDipendente} onChange={e => setEditDipendente(e.target.value)} className="w-full p-2 border rounded bg-orange-50 outline-none text-sm font-bold">
                  {listaDipendenti.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Modifica Note */}
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500">Note Ordine</label>
                <textarea value={editNote} onChange={e => setEditNote(e.target.value)} className="w-full p-2 border rounded bg-yellow-50 outline-none focus:border-[#0F5C35] text-sm h-16 resize-none" />
              </div>

              <hr className="my-2" />

              {/* Modifica Carrello (Originale) */}
              <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">Prodotti nell'ordine</label>
              <div className="space-y-2">
                {carrelloModifica.map((item) => (
                  <div key={item.prodotto.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm">
                    <span className="text-sm font-semibold">{item.prodotto.nome}</span>
                    <div className="flex items-center gap-2">
                      {item.prodotto.a_peso ? (
                        <input type="number" step="50" value={item.quantita} onChange={e => aggiornaQuantitaModifica(item.prodotto.id, 0, true, parseInt(e.target.value))} className="w-16 p-1 border rounded text-center text-xs outline-none focus:border-[#F17329] bg-white" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => aggiornaQuantitaModifica(item.prodotto.id, -1, false)} className="w-6 h-6 bg-white border rounded font-bold hover:bg-gray-50">-</button>
                          <span className="font-bold text-xs w-4 text-center">{item.quantita}</span>
                          <button onClick={() => aggiornaQuantitaModifica(item.prodotto.id, 1, false)} className="w-6 h-6 bg-gray-200 rounded font-bold hover:bg-gray-300">+</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <select value={prodottoDaAggiungere} onChange={e => setProdottoDaAggiungere(e.target.value)} className="flex-1 p-2 border rounded text-sm bg-white outline-none">
                  <option value="">+ Aggiungi prodotto extra...</option>
                  {catalogoProdotti.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <button onClick={aggiungiAOrdine} className="bg-[#0F5C35] text-white px-4 py-2 rounded text-sm font-bold hover:bg-[#0b4226]">OK</button>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t sticky bottom-0 bg-white">
              <button onClick={() => setOrdineInModifica(null)} className="flex-1 bg-gray-100 py-3 rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-200">Annulla</button>
              <button onClick={salvaModifiche} className="flex-1 bg-[#F17329] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#d96521]">Salva Modifiche</button>
            </div>
          </div>
        </div>
      )}

      {/* SCONTRINO TERMICO DINAMICO */}
      <div className="hidden print:block w-[80mm] bg-white text-black font-mono text-sm p-2">
        
        {/* 4 SPAZI IN CIMA INFALLIBILI */}
        <br /><br /><br /><br />
        
        {tipoStampa === "Singolo" && ordineDaStampare ? (
          <>
            <div className="text-center font-bold text-xl mb-4 border-b-2 border-black pb-2">RISTAMPA ORDINE</div>
            <div className="mb-4">
              <p className="font-bold text-lg uppercase">{ordineDaStampare.clienti?.nome_completo}</p>
              <p>Ritiro: <span className="font-bold">{new Date(ordineDaStampare.data_ritiro).toLocaleDateString('it-IT')}</span></p>
              <p>Ore: {ordineDaStampare.orario_ritiro} ({ordineDaStampare.fascia_oraria})</p>
              <p className="mt-2 text-xs border-t pt-1">Gestito da: <span className="font-bold">{ordineDaStampare.dipendente}</span></p>
            </div>
            <div className="border-b border-black mb-2 border-dashed"></div>
            <table className="w-full mb-4">
              <tbody>
                {ordineDaStampare.dettagli_ordine.map((d, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="pt-2 font-bold w-1/4 align-top">{d.quantita}{d.prodotti?.a_peso ? "g" : "x"}</td>
                    <td className="pt-2 w-3/4 align-top">{d.prodotti?.nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {ordineDaStampare.note && (
              <div className="mb-4 p-2 border-2 border-black rounded-lg">
                <p className="font-bold uppercase text-[10px] mb-1">📝 NOTE ORDINE:</p>
                <p className="font-bold text-sm whitespace-pre-wrap leading-tight">{ordineDaStampare.note}</p>
              </div>
            )}

            <div className="text-center mt-6 text-[10px] uppercase tracking-tighter">Ristampato il: {new Date().toLocaleString('it-IT')}</div>
            
            {/* 10 SPAZI IN FONDO INFALLIBILI PER IL TAGLIO */}
            <br /><br /><br /><br /><br /><br /><br /><br /><br /><br />
            <div className="text-transparent text-[1px]">.</div>
          </>
        ) : (
          <>
            <div className="text-center font-bold text-lg mb-2 border-b-2 border-black pb-1">
              DA PREPARARE: {tipoStampa?.toUpperCase()}
            </div>
            <div className="text-center mb-4">Data: {new Date(dataFiltro).toLocaleDateString('it-IT')}</div>
            <table className="w-full">
              <tbody>
                {Object.entries(tipoStampa === "Mattina" ? riepilogoMattina : riepilogoPomeriggio).map(([n, i]) => (
                  <tr key={n} className="border-b border-dashed border-gray-400">
                    <td className="py-2">{n}</td><td className="py-2 font-bold text-right">{i.quantita}{i.a_peso ? "g" : "x"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* 10 SPAZI IN FONDO INFALLIBILI PER IL TAGLIO */}
            <br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br />
            <div className="text-transparent text-[1px]">.</div>
          </>
        )}
      </div>
    </>
  );
}