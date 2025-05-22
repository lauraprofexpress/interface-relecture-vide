import React from "react";
import "katex/dist/katex.min.css";
import katex from "katex";

// Composant qui rend du texte contenant des expressions LaTeX
// Les expressions LaTeX doivent être délimitées par $...$
const LatexRenderer = ({ text }) => {
  if (!text) return null;

  // Séparation du texte en parties normales et expressions LaTeX
  const parts = text.split(/(\$[^$]+\$)/g);

  return (
    <span className="latex-content">
      {parts.map((part, index) => {
        // Si c'est une expression LaTeX (entourée par des $)
        if (part.startsWith("$") && part.endsWith("$")) {
          const latex = part.slice(1, -1); // Enlever les $
          try {
            const html = katex.renderToString(latex, {
              throwOnError: false,
              displayMode: false,
            });

            return (
              <span
                key={index}
                className="latex-formula"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (error) {
            console.error("Erreur de rendu LaTeX:", error);
            return (
              <span key={index} className="latex-error">
                {part}
              </span>
            );
          }
        }

        // Sinon c'est du texte normal
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default LatexRenderer;
