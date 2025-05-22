import React, { useState, useRef, useEffect } from "react";
import LatexRenderer from "./LatexRenderer";

const CustomDropdown = ({ 
  options, 
  value, 
  onChange, 
  disabled, 
  className, 
  placeholder = "Choisir..." 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const dropdownRef = useRef(null);

  // Initialiser l'option sélectionnée
  useEffect(() => {
    setSelectedOption(value);
  }, [value]);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    setSelectedOption(option);
    onChange(option);
    setIsOpen(false);
  };

  // Trouver l'option sélectionnée pour l'affichage
  const selectedDisplay = options.find(opt => opt === selectedOption) || placeholder;

  return (
    <div
      ref={dropdownRef}
      className={`custom-dropdown ${className || ""} ${disabled ? "disabled" : ""}`}
    >
      <div
        className="dropdown-selected"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedOption ? (
          <LatexRenderer text={selectedDisplay} />
        ) : (
          <span>{placeholder}</span>
        )}
        <span className="dropdown-arrow">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && !disabled && (
        <div className="dropdown-options">
          {options.map((option, index) => (
            <div
              key={index}
              className={`dropdown-option ${option === selectedOption ? "selected" : ""}`}
              onClick={() => handleSelect(option)}
            >
              <LatexRenderer text={option} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;