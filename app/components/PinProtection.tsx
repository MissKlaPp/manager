"use client";

import { useState, useEffect } from "react";

export default function PinProtection({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 🔑 IMPOSTA QUI IL TUO PIN SEGRETO
  const PIN_CORRETTO = "1234"; 

  // Controlliamo se l'utente aveva già fatto l'accesso (così non deve rimetterlo se ricarica la pagina)
  useEffect(() => {
    setIsMounted(true);
    const auth = localStorage.getItem("senzalu_auth");
    if (auth === "sbloccato") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === PIN_CORRETTO) {
      // Salva l'accesso nella memoria del tablet
      localStorage.setItem("senzalu_auth", "sbloccato");
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPin(""); // Svuota la casella se sbaglia
    }
  };

  // Aspettiamo che la pagina carichi per evitare sfarfallii
  if (!isMounted) return null; 

  // Se è autenticato, mostra tutta l'applicazione (il gestionale vero e proprio)
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Se NON è autenticato, mostra la schermata di blocco
  return (
    <div className="min-h-screen bg-[#0F5C35] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border-b-8 border-[#FDBE15]">
        
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img 
            src="/logo.png" 
            alt="SenzaGLÙ Logo" 
            className="w-32 h-32 rounded-full object-cover border-4 border-[#0F5C35] shadow-lg" 
          />
        </div>

        <h1 className="text-3xl font-black text-[#0F5C35] mb-1 tracking-tight">Senza<span className="text-[#FDBE15]">GLÙ</span></h1>
        <p className="text-[#F17329] font-bold uppercase tracking-widest text-xs mb-8">Area Personale</p>

        {/* Form del PIN */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input
              type="password"
              pattern="[0-9]*" // Fa aprire il tastierino numerico sui tablet
              inputMode="numeric"
              placeholder="Inserisci il PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={`w-full p-4 text-center text-2xl font-black tracking-[0.5em] border-2 rounded-xl outline-none transition-colors ${
                error ? "border-red-500 bg-red-50" : "border-gray-200 focus:border-[#F17329]"
              }`}
            />
            {error && <p className="text-red-500 font-bold text-sm mt-2">PIN errato, riprova.</p>}
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#F17329] hover:bg-[#d96521] text-white font-black py-4 rounded-xl text-lg uppercase tracking-wider transition shadow-lg"
          >
            Sblocca App
          </button>
        </form>

        <p className="mt-8 text-xs text-gray-400 font-semibold">
          Accesso riservato allo staff
        </p>
      </div>
    </div>
  );
}