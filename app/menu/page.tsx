"use client";

import { useState, useEffect } from "react";
// Assicurati che il percorso verso il tuo file supabaseClient sia corretto. 
// Se lo hai messo nella cartella "lib" nella root del progetto:
import { supabase } from "../../lib/supabaseClient"; 

type Prodotto = {
  id: string;
  nome: string;
  categoria: string;
  attivo: boolean;
};

export default function GestioneMenu() {
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Senza Glutine");
  const [loading, setLoading] = useState(true);

  // Funzione per caricare i prodotti all'avvio
  const fetchProdotti = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prodotti")
      .select("*")
      .order("creato_il", { ascending: false });

    if (error) {
      console.error("Errore nel caricamento prodotti:", error);
    } else {
      setProdotti(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProdotti();
  }, []);

  // Funzione per aggiungere un nuovo prodotto
  const aggiungiProdotto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const { error } = await supabase
      .from("prodotti")
      .insert([{ nome, categoria }]);

    if (error) {
      alert("Errore durante l'aggiunta del prodotto");
      console.error(error);
    } else {
      setNome(""); // Svuota il campo
      fetchProdotti(); // Ricarica la lista
    }
  };

  // Funzione per eliminare (o disattivare) un prodotto
  const eliminaProdotto = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo prodotto?")) return;

    const { error } = await supabase
      .from("prodotti")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Errore durante l'eliminazione");
    } else {
      fetchProdotti();
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Gestione Menu</h1>

      {/* Form di aggiunta prodotto */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4">Aggiungi Nuovo Prodotto</h2>
        <form onSubmit={aggiungiProdotto} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Prodotto</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="es. Pane casereccio SG"
              required
            />
          </div>
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Senza Glutine">Senza Glutine</option>
              <option value="Pane">Pane</option>
              <option value="Dolci">Dolci</option>
              <option value="Rustici">Rustici</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition"
          >
            Aggiungi
          </button>
        </form>
      </div>

      {/* Lista Prodotti */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4">Prodotti a Menu</h2>
        {loading ? (
          <p className="text-gray-500">Caricamento in corso...</p>
        ) : prodotti.length === 0 ? (
          <p className="text-gray-500">Nessun prodotto presente. Aggiungine uno!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prodotti.map((prodotto) => (
              <div key={prodotto.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div>
                  <p className="font-bold text-gray-800">{prodotto.nome}</p>
                  <p className="text-sm text-gray-500">{prodotto.categoria}</p>
                </div>
                <button
                  onClick={() => eliminaProdotto(prodotto.id)}
                  className="text-red-500 hover:text-red-700 font-semibold p-2"
                >
                  Elimina
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}