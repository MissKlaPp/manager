"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type Prodotto = {
  id: string;
  nome: string;
  categoria: string;
  attivo: boolean;
  a_peso: boolean;
};

export default function GestioneMenu() {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Pane");
  const [aPeso, setAPeso] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prodottoInModifica, setProdottoInModifica] = useState<Prodotto | null>(null);

  // LISTA CATEGORIE UFFICIALI (Senza Vuota / Altro)
  const categorie = ["Pane", "Pizzeria", "Colazione", "Primi Piatti", "Rosticceria", "Dolci", "Focaccia"];

  const fetchProdotti = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("prodotti")
      .select("*")
      .eq("attivo", true)
      .order("creato_il", { ascending: false });
      
    if (data) setProdotti(data);
    setLoading(false);
  };

  useEffect(() => { fetchProdotti(); }, []);

  const aggiungiProdotto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    
    const { error } = await supabase
      .from("prodotti")
      .insert([{ nome, categoria, a_peso: aPeso, attivo: true }]);
      
    if (!error) {
      setNome(""); setAPeso(false); fetchProdotti();
    } else {
      alert("Errore durante l'aggiunta del prodotto.");
      console.error(error);
    }
  };

  const salvaModifica = async () => {
    if (!prodottoInModifica) return;
    const { error } = await supabase
      .from("prodotti")
      .update({ 
        nome: prodottoInModifica.nome, 
        categoria: prodottoInModifica.categoria, 
        a_peso: prodottoInModifica.a_peso 
      })
      .eq("id", prodottoInModifica.id);

    if (!error) {
      setProdottoInModifica(null);
      fetchProdotti();
    } else {
      alert("Errore durante la modifica.");
    }
  };

  const eliminaProdotto = async (id: string) => {
    if (!confirm("Sei sicuro di voler rimuovere questo prodotto dal menu?")) return;
    
    const { error } = await supabase
      .from("prodotti")
      .update({ attivo: false })
      .eq("id", id);
      
    if (!error) {
      fetchProdotti();
    } else {
      alert("Errore durante l'eliminazione.");
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Gestione Menu</h1>

      {/* BOX AGGIUNGI PRODOTTO */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-[#0F5C35]">Aggiungi Nuovo Prodotto</h2>
        <form onSubmit={aggiungiProdotto} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <input 
              type="text" 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#F17329] bg-white" 
              placeholder="Nome Prodotto..." 
              required 
            />
          </div>
          <select 
            value={categoria} 
            onChange={e => setCategoria(e.target.value)} 
            className="w-full md:w-auto p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#F17329]"
          >
            {categorie.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex items-center gap-2 pb-3">
            <input 
              type="checkbox" 
              id="aPeso" 
              checked={aPeso} 
              onChange={e => setAPeso(e.target.checked)} 
              className="w-5 h-5 accent-[#0F5C35] cursor-pointer" 
            />
            <label htmlFor="aPeso" className="text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap">a peso (g)</label>
          </div>
          <button type="submit" className="w-full md:w-auto bg-[#0F5C35] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#0b4226] transition shadow-sm">
            Aggiungi
          </button>
        </form>
      </div>

      {/* LISTA PRODOTTI DIVISA PER CATEGORIE */}
      {loading ? (
        <p className="text-gray-500 font-semibold animate-pulse">Caricamento menu in corso...</p>
      ) : (
        <div className="space-y-8">
          {categorie.map((cat) => {
            const prodottiInCat = prodotti.filter(p => p.categoria === cat);
            if (prodottiInCat.length === 0) return null;

            return (
              <div key={cat} className="space-y-4">
                <h2 className="text-xl font-black text-[#0F5C35] uppercase tracking-wider border-b-2 border-[#FDBE15] pb-1 inline-block">
                  {cat}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {prodottiInCat.map((prodotto) => (
                    <div key={prodotto.id} className="bg-white p-4 rounded-xl border flex flex-col justify-between shadow-sm hover:border-[#FDBE15] transition">
                      <div>
                        <p className="font-bold text-lg text-gray-800">{prodotto.nome}</p>
                        <p className="text-sm text-[#F17329] font-bold uppercase tracking-wider">{prodotto.a_peso ? "A PESO (grammi)" : "A PEZZI"}</p>
                      </div>
                      <div className="flex justify-end gap-4 mt-4 pt-3 border-t border-gray-100">
                        <button onClick={() => setProdottoInModifica(prodotto)} className="text-[#0F5C35] font-bold text-sm hover:underline">
                          Modifica
                        </button>
                        <button onClick={() => eliminaProdotto(prodotto.id)} className="text-red-500 font-bold text-sm hover:underline">
                          Elimina
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {prodotti.length === 0 && (
            <p className="text-gray-500">Nessun prodotto nel menu. Aggiungi il primo!</p>
          )}
        </div>
      )}

      {/* POP-UP MODIFICA PRODOTTO */}
      {prodottoInModifica && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl border-t-8 border-[#FDBE15]">
            <h2 className="text-2xl font-bold mb-6 text-[#0F5C35]">Modifica Prodotto</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Nome prodotto</label>
                <input 
                  type="text" 
                  value={prodottoInModifica.nome} 
                  onChange={e => setProdottoInModifica({...prodottoInModifica, nome: e.target.value})} 
                  className="w-full p-3 border-2 border-gray-100 rounded-lg outline-none focus:border-[#F17329] bg-white" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Categoria</label>
                <select 
                  value={prodottoInModifica.categoria} 
                  onChange={e => setProdottoInModifica({...prodottoInModifica, categoria: e.target.value})} 
                  className="w-full p-3 border-2 border-gray-100 rounded-lg bg-white outline-none focus:border-[#F17329]"
                >
                  {categorie.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <input 
                  type="checkbox" 
                  id="editPeso" 
                  checked={prodottoInModifica.a_peso} 
                  onChange={e => setProdottoInModifica({...prodottoInModifica, a_peso: e.target.checked})} 
                  className="w-5 h-5 accent-[#0F5C35] cursor-pointer" 
                />
                <label htmlFor="editPeso" className="font-bold text-gray-700 cursor-pointer">Si vende a peso (grammi)</label>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setProdottoInModifica(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">
                Annulla
              </button>
              <button onClick={salvaModifica} className="flex-1 bg-[#0F5C35] hover:bg-[#0b4226] text-white py-3 rounded-xl font-bold transition shadow-md">
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}