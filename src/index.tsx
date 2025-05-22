import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Ajouter une capture globale des erreurs non gérées
window.addEventListener("error", (event) => {
  console.error("Erreur non gérée :", event.error);
  // Empêcher l'affichage de l'erreur par défaut du navigateur
  event.preventDefault();
});

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

// Désactiver StrictMode qui peut causer des problèmes avec certains composants
// en exécutant le code deux fois en développement
root.render(<App />);
