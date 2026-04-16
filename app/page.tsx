"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type Prodotto = { id: string; nome: string; categoria: string; a_peso: boolean; };
type ElementoCarrello = { prodotto: Prodotto; quantita: number; };

export default function NuovoOrdine() {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [carrello, setCarrello] = useState<ElementoCarrello[]>([]);
  const [ricerca, setRicerca] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [nomeCliente, setNomeCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [dataRitiro, setDataRitiro] = useState("");
  const [fasciaOraria, setFasciaOraria] = useState("Mattina");
  const [orarioRitiro, setOrarioRitiro] = useState("");
  const [dipendente, setDipendente] = useState("Agnese");
  const [noteOrdine, setNoteOrdine] = useState("");

  const [nomeAlVolo, setNomeAlVolo] = useState("");
  const [aPesoAlVolo, setAPesoAlVolo] = useState(false);
  const [creandoAlVolo, setCreandoAlVolo] = useState(false);

  // LA CASSA FORTE DI STAMPA
  const [datiStampa, setDatiStampa] = useState<any>(null);

  const listaDipendenti = ["Agnese", "Tatiana", "Giusy", "Carmen", "Lillo", "Domenico", "Mariagrazia"];
  const categorieOrdinate = ["Pane", "Pizzeria", "Colazione", "Primi Piatti", "Rosticceria", "Dolci", "Focaccia", "Vuota / Altro"];

  useEffect(() => {
    const fetchProdotti = async () => {
      const { data } = await supabase.from("prodotti").select("*").eq("attivo", true);
      if (data) setProdotti(data);
    };
    fetchProdotti();
    setDataRitiro(new Date().toISOString().split('T')[0]);
  }, []);

  const aggiornaPezzi = (prodotto: Prodotto, delta: number) => {
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

  const impostaGrammi = (prodotto: Prodotto, grammi: number) => {
    setCarrello((prev) => {
      if (grammi <= 0) return prev.filter((item) => item.prodotto.id !== prodotto.id);
      const esistente = prev.find((item) => item.prodotto.id === prodotto.id);
      if (esistente) return prev.map((item) => item.prodotto.id === prodotto.id ? { ...item, quantita: grammi } : item);
      return [...prev, { prodotto, quantita: grammi }];
    });
  };

  const ottieniQuantita = (id: string) => carrello.find((item) => item.prodotto.id === id)?.quantita || 0;

  const creaProdottoAlVolo = async () => {
    if (!nomeAlVolo.trim()) return;
    setCreandoAlVolo(true);

    const { data, error } = await supabase
      .from("prodotti")
      .insert([{ nome: nomeAlVolo.trim(), categoria: "Vuota / Altro", a_peso: aPesoAlVolo, attivo: false }])
      .select()
      .single();

    if (data && !error) {
      if (aPesoAlVolo) {
        impostaGrammi(data, 100);
      } else {
        aggiornaPezzi(data, 1);
      }
      setNomeAlVolo("");
      setAPesoAlVolo(false);
    } else {
      alert("Errore nella creazione del prodotto personalizzato.");
    }
    setCreandoAlVolo(false);
  };

  const confermaOrdine = async () => {
    if (!nomeCliente || !dataRitiro || !orarioRitiro) {
      alert(`Errore di compilazione! Controlla i campi obbligatori.`);
      return;
    }

    try {
      let clienteId = null;

      // 1. Se c'è il telefono, cerchiamo se il cliente esiste già per aggiornargli il contatore ordini
      if (telefonoCliente) {
        const { data: clienteEsistente } = await supabase.from("clienti").select("*").eq("telefono", telefonoCliente).single();
        if (clienteEsistente) {
          clienteId = clienteEsistente.id;
          await supabase.from("clienti").update({ ordini_totali: clienteEsistente.ordini_totali + 1 }).eq("id", clienteId);
        }
      }

      // 2. BUG FIX: Se non abbiamo trovato il cliente (o se non ha inserito il telefono), LO CREIAMO SEMPRE!
      if (!clienteId) {
        const { data: nuovoCliente } = await supabase.from("clienti").insert([{ 
          nome_completo: nomeCliente, 
          telefono: telefonoCliente || null // Salviamo il telefono solo se c'è, altrimenti null
        }]).select().single();
        
        clienteId = nuovoCliente?.id;
      }

      // 3. Creiamo l'ordine agganciando sempre l'ID del cliente
      const { data: nuovoOrdine, error: errOrdine } = await supabase
        .from("ordini")
        .insert([{ 
          cliente_id: clienteId, 
          data_ritiro: dataRitiro, 
          fascia_oraria: fasciaOraria, 
          orario_ritiro: orarioRitiro,
          dipendente: dipendente,
          note: noteOrdine
        }])
        .select().single();
      
      if (errOrdine) throw errOrdine;

      const dettagli = carrello.map((item) => ({
        ordine_id: nuovoOrdine.id,
        prodotto_id: item.prodotto.id,
        quantita: item.quantita,
      }));
      await supabase.from("dettagli_ordine").insert(dettagli);

      setDatiStampa({
        carrello: [...carrello],
        nomeCliente, dataRitiro, fasciaOraria, orarioRitiro, dipendente, noteOrdine
      });

      setTimeout(() => {
        window.print();
        
        setCarrello([]);
        setShowModal(false);
        setNomeCliente("");
        setTelefonoCliente("");
        setOrarioRitiro("");
        setNoteOrdine("");
      }, 300);

    } catch (error) {
      console.error(error);
      alert("Errore nel salvataggio");
    }
  };

  const prodottiFiltrati = prodotti.filter(p => p.nome.toLowerCase().includes(ricerca.toLowerCase()));

  const p_carrello = datiStampa ? datiStampa.carrello : carrello;
  const p_nome = datiStampa ? datiStampa.nomeCliente : nomeCliente;
  const p_data = datiStampa ? datiStampa.dataRitiro : dataRitiro;
  const p_ora = datiStampa ? datiStampa.orarioRitiro : orarioRitiro;
  const p_fascia = datiStampa ? datiStampa.fasciaOraria : fasciaOraria;
  const p_dip = datiStampa ? datiStampa.dipendente : dipendente;
  const p_note = datiStampa ? datiStampa.noteOrdine : noteOrdine;

  return (
    <>
      <div className="space-y-8 pb-32 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Nuovo Ordine</h1>
          <div className="w-full md:w-80">
            <input 
              type="text" 
              placeholder="🔍 Cerca prodotto..." 
              className="w-full p-3 border-2 border-gray-100 rounded-xl shadow-sm outline-none focus:border-[#F17329] bg-white transition" 
              value={ricerca} 
              onChange={(e) => setRicerca(e.target.value)}
            />
          </div>
        </div>

        {categorieOrdinate.map((cat) => {
          const prodottiInCat = prodottiFiltrati.filter(p => p.categoria === cat);
          if (prodottiInCat.length === 0 && cat !== "Vuota / Altro") return null;

          return (
            <div key={cat} className="space-y-4">
              <h2 className={`text-xl font-black uppercase tracking-wider border-b-2 pb-1 inline-block ${cat === 'Vuota / Altro' ? 'text-gray-500 border-gray-300' : 'text-[#0F5C35] border-[#FDBE15]'}`}>
                {cat}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {prodottiInCat.map((prodotto) => (
                  <div key={prodotto.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:border-[#0F5C35] transition">
                    <h3 className="font-bold text-gray-800 mb-4">{prodotto.nome}</h3>
                    {prodotto.a_peso ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          step="50" 
                          placeholder="g..." 
                          value={ottieniQuantita(prodotto.id) || ""} 
                          onChange={(e) => impostaGrammi(prodotto, parseInt(e.target.value) || 0)} 
                          className="w-full p-2 border rounded-lg text-center font-bold bg-white outline-none focus:border-[#F17329]"
                        />
                        <span className="font-bold text-gray-400">g</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-orange-50/50 p-1.5 rounded-lg border border-orange-100">
                        <button onClick={() => aggiornaPezzi(prodotto, -1)} className="w-10 h-10 bg-white font-bold rounded border shadow-sm text-gray-700 hover:bg-gray-50">-</button>
                        <span className="font-bold text-xl text-[#0F5C35]">{ottieniQuantita(prodotto.id)}</span>
                        <button onClick={() => aggiornaPezzi(prodotto, 1)} className="w-10 h-10 bg-[#F17329] text-white font-bold rounded shadow-sm hover:bg-[#d96521]">+</button>
                      </div>
                    )}
                  </div>
                ))}

                {cat === "Vuota / Altro" && (
                  <div className="bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-300 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-gray-500 mb-2 text-sm uppercase">✏️ Nuovo (Fuori Listino)</h3>
                      <input 
                        type="text" 
                        placeholder="Nome speciale..." 
                        value={nomeAlVolo}
                        onChange={e => setNomeAlVolo(e.target.value)}
                        className="w-full p-2 border rounded-lg outline-none focus:border-[#F17329] bg-white mb-2 text-sm"
                      />
                      <div className="flex items-center gap-2 mb-3">
                        <input 
                          type="checkbox" 
                          id="pesoAlVolo"
                          checked={aPesoAlVolo}
                          onChange={e => setAPesoAlVolo(e.target.checked)}
                          className="w-4 h-4 accent-gray-500" 
                        />
                        <label htmlFor="pesoAlVolo" className="text-xs font-bold text-gray-500 cursor-pointer">Si vende a peso</label>
                      </div>
                    </div>
                    <button 
                      onClick={creaProdottoAlVolo}
                      disabled={creandoAlVolo || !nomeAlVolo.trim()}
                      className="w-full bg-gray-600 text-white font-bold py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm transition shadow-sm"
                    >
                      {creandoAlVolo ? "..." : "+ Aggiungi all'ordine"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {carrello.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-[#0F5C35] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] flex justify-between items-center max-w-6xl mx-auto rounded-t-2xl z-40">
            <div className="text-lg font-bold">Prodotti selezionati: <span className="text-[#F17329]">{carrello.length}</span></div>
            <button onClick={() => setShowModal(true)} className="bg-[#0F5C35] hover:bg-[#0b4226] text-white px-10 py-3 rounded-xl font-bold text-lg transition shadow-lg">Continua</button>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto shadow-2xl border-t-8 border-[#FDBE15]">
              <h2 className="text-2xl font-black mb-6 text-[#0F5C35] uppercase tracking-tight">Riepilogo Ordine</h2>
              
              <div className="mb-8 space-y-4">
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                  <label className="block text-xs font-black text-[#F17329] uppercase mb-1">Dipendente al banco:</label>
                  <select value={dipendente} onChange={e => setDipendente(e.target.value)} className="w-full p-2 border border-orange-300 rounded-lg bg-white font-bold outline-none">
                    {listaDipendenti.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="grid gap-4">
                  <input type="text" placeholder="Nome Cliente *" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-[#0F5C35] bg-white" required />
                  <input type="tel" placeholder="Telefono (opzionale)" value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value)} className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-[#0F5C35] bg-white" />
                  
                  <div className="flex gap-4">
                    <input type="date" value={dataRitiro} onChange={e => setDataRitiro(e.target.value)} className="w-1/2 p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-[#0F5C35] bg-white" required />
                    <select value={fasciaOraria} onChange={e => setFasciaOraria(e.target.value)} className="w-1/2 p-3 border-2 border-gray-100 rounded-xl bg-white outline-none">
                      <option value="Mattina">Mattina</option>
                      <option value="Pomeriggio">Pomeriggio</option>
                    </select>
                  </div>
                  <input type="time" value={orarioRitiro} onChange={e => setOrarioRitiro(e.target.value)} className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-[#0F5C35] bg-white" required />
                  
                  <textarea 
                    placeholder="Note ordine (es. Senza pomodoro, incartare doppio...)" 
                    value={noteOrdine} 
                    onChange={e => setNoteOrdine(e.target.value)} 
                    className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-[#0F5C35] bg-white h-24 resize-none" 
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowModal(false)} className="w-1/3 bg-gray-100 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition">Modifica</button>
                <button onClick={confermaOrdine} className="w-2/3 bg-[#0F5C35] hover:bg-[#0b4226] text-white py-4 rounded-xl font-bold transition shadow-md">Conferma e Stampa</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SCONTRINO TERMICO 80mm */}
      <div className="hidden print:block w-[80mm] bg-white text-black font-mono text-sm p-2 relative">
        
        {/* 4 SPAZI IN CIMA INFALLIBILI */}
        <br /><br /><br /><br />
        
        <div className="text-center font-bold text-xl mb-4 border-b-2 border-black pb-2">SenzaGLÙ</div>
        <div className="mb-4">
          <p className="font-bold text-lg uppercase">{p_nome}</p>
          <p>Ritiro: <span className="font-bold">{new Date(p_data || new Date()).toLocaleDateString('it-IT')}</span></p>
          <p>Ore: {p_ora} ({p_fascia})</p>
          <p className="mt-2 text-xs border-t pt-1">Dipendente: <span className="font-bold">{p_dip}</span></p>
        </div>
        <div className="border-b border-black mb-2 border-dashed"></div>
        
        <table className="w-full mb-4">
          <tbody>
            {p_carrello.map((item: ElementoCarrello) => (
              <tr key={item.prodotto.id} className="border-b border-gray-200">
                <td className="pt-2 font-bold w-1/4 align-top">{item.quantita}{item.prodotto.a_peso ? "g" : "x"}</td>
                <td className="pt-2 w-3/4 align-top">{item.prodotto.nome}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {p_note && (
          <div className="mb-4 p-2 border-2 border-black rounded-lg">
            <p className="font-bold uppercase text-[10px] mb-1">📝 NOTE ORDINE:</p>
            <p className="font-bold text-sm whitespace-pre-wrap leading-tight">{p_note}</p>
          </div>
        )}

        <div className="text-center mt-6 text-[10px] uppercase tracking-tighter">Grazie e a presto da SenzaGLÙ!</div>
        
        {/* SPAZI IN FONDO INFALLIBILI PER IL TAGLIO */}
        <br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br />
        <div className="text-transparent text-[1px]">.</div>
      </div>
    </>
  );
}