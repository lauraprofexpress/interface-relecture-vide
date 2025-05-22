import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Download,
  Eye,
  Edit,
  Plus,
  Trash,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  FileText,
  Home,
  Image,
  X,
} from "lucide-react";

// Import du composant de rendu LaTeX
import LatexRenderer from "./LatexRenderer";

// Import des styles et des données d'exemple
import "./styles.css";
import { sampleExercises, allSubjects, allLevels } from "./exerciseData";

// Helper pour détecter si un texte contient du LaTeX
const containsLatex = (text) => {
  return text && text.includes("$");
};

// Composant CustomDropdown modifié pour utiliser select standard quand pas de LaTeX
const CustomDropdown = ({
  options,
  value,
  onChange,
  disabled,
  className,
  placeholder = "Choisir...",
}) => {
  // Vérifie si au moins une option contient du LaTeX
  const hasLatexOptions = options.some((opt) => containsLatex(opt));

  // Si aucune option ne contient de LaTeX, utiliser un select standard
  if (!hasLatexOptions) {
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`blank-select ${className || ""}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  // Sinon, utiliser le dropdown personnalisé avec rendu LaTeX
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
  const selectedDisplay =
    options.find((opt) => opt === selectedOption) || placeholder;

  return (
    <div
      ref={dropdownRef}
      className={`custom-dropdown ${className || ""} ${
        disabled ? "disabled" : ""
      }`}
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
              className={`dropdown-option ${
                option === selectedOption ? "selected" : ""
              }`}
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

// Composant ImageUploader pour télécharger des images
const ImageUploader = ({
  currentImageUrl,
  onImageChange,
  label = "Image",
  previewSize = "medium", // small, medium, large
}) => {
  const [imageUrl, setImageUrl] = useState(currentImageUrl || "");

  const handleUrlChange = (e) => {
    setImageUrl(e.target.value);
    onImageChange(e.target.value);
  };

  const clearImage = () => {
    setImageUrl("");
    onImageChange("");
  };

  // Classes CSS selon la taille souhaitée
  const getPreviewClasses = () => {
    switch (previewSize) {
      case "small":
        return "max-w-16 max-h-16";
      case "large":
        return "max-w-64 max-h-48";
      case "medium":
      default:
        return "max-w-32 max-h-24";
    }
  };

  return (
    <div className="file-input-wrapper">
      <label className="form-label">{label}</label>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={imageUrl}
          onChange={handleUrlChange}
          placeholder="URL de l'image"
          className="form-input"
        />
      </div>

      {imageUrl && (
        <div className="image-preview">
          <p className="preview-img-title">Aperçu :</p>
          <img
            src={imageUrl}
            alt="Aperçu"
            className={getPreviewClasses()}
            onError={(e) => {
              e.target.src =
                "https://via.placeholder.com/200x150?text=Image+non+disponible";
              e.target.onerror = null;
            }}
          />
          <div className="image-preview-actions">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={clearImage}
            >
              <X size={14} className="icon" /> Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  // États principaux
  const [exercises, setExercises] = useState([]);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showExerciseList, setShowExerciseList] = useState(true);

  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "all",
    validationStatus: "all",
    subject: "all",
    level: "all",
  });
  const [showFilters, setShowFilters] = useState(false);

  // État pour le tri
  const [sortBy, setSortBy] = useState("conceptName");
  const [sortOrder, setSortOrder] = useState("asc");

  // Pas de pagination - afficher tous les exercices
  const [currentPage] = useState(1);
  const [exercisesPerPage] = useState(1000); // Nombre très élevé pour afficher tous les exercices

  // État pour la sélection multiple
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [selectMode, setSelectMode] = useState(false);

  // État pour la notification
  const [notification, setNotification] = useState(null);

  // Initialiser les exercices au chargement
  useEffect(() => {
    // S'assurer que tous les exercices ont les champs requis
    const processedExercises = sampleExercises.map((ex) => ({
      ...ex,
      validationStatus: ex.validationStatus || "pending",
      tags: [], // Tags vides par défaut puisqu'on ne les utilise plus
      subject: ex.subject || "",
      level: ex.level || "",
      conceptName: ex.conceptName || "",
      exerciseNumber: ex.exerciseNumber || 1,
    }));

    setExercises(processedExercises);
    console.log("Chargement de", processedExercises.length, "exercices");
  }, []);

  // Filtrer les exercices en fonction des critères
  const filteredExercises = exercises
    .filter((exercise) => {
      // Filtre par type
      if (filters.type !== "all" && exercise.type !== filters.type) {
        return false;
      }

      // Filtre par statut de validation
      if (filters.validationStatus !== "all") {
        const isValidated = exercise.validationStatus === "validated";
        if (filters.validationStatus === "validated" && !isValidated) {
          return false;
        }
        if (filters.validationStatus === "pending" && isValidated) {
          return false;
        }
      }

      // Filtre par matière
      if (filters.subject !== "all" && exercise.subject !== filters.subject) {
        return false;
      }

      // Filtre par niveau
      if (filters.level !== "all" && exercise.level !== filters.level) {
        return false;
      }

      // Filtre par recherche
      if (searchTerm && searchTerm.trim() !== "") {
        const searchTermLower = searchTerm.toLowerCase();
        return (
          (exercise.text &&
            exercise.text.toLowerCase().includes(searchTermLower)) ||
          (exercise.id &&
            exercise.id.toLowerCase().includes(searchTermLower)) ||
          (exercise.conceptName &&
            exercise.conceptName.toLowerCase().includes(searchTermLower)) ||
          (exercise.subject &&
            exercise.subject.toLowerCase().includes(searchTermLower)) ||
          (exercise.level &&
            exercise.level.toLowerCase().includes(searchTermLower))
        );
      }

      return true;
    })
    .sort((a, b) => {
      // Fonction de tri
      const getSortValue = (ex, field) => {
        switch (field) {
          case "conceptName":
            return ex.conceptName || "";
          case "subject":
            return ex.subject || "";
          case "level":
            // Tri spécial pour les niveaux pour respecter l'ordre scolaire
            const levelOrder = {
              CP: 1,
              CE1: 2,
              CE2: 3,
              CM1: 4,
              CM2: 5,
              "6ème": 6,
              "5ème": 7,
              "4ème": 8,
              "3ème": 9,
              "2nde": 10,
              "1ère": 11,
              Terminale: 12,
            };
            return levelOrder[ex.level] || 999;
          case "exerciseNumber":
            return ex.exerciseNumber || 0;
          default:
            return "";
        }
      };

      const aValue = getSortValue(a, sortBy);
      const bValue = getSortValue(b, sortBy);

      if (sortBy === "exerciseNumber") {
        // Tri numérique pour les numéros d'exercice
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      } else {
        // Tri alphabétique pour les autres champs
        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      }
    });

  // Tous les exercices sont affichés sur une seule page
  const currentExercises = filteredExercises;
  const totalPages = 1;

  // Afficher une notification
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Import d'exercices depuis un fichier JSON
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let importedExercises = JSON.parse(e.target.result);

          // S'assurer que c'est un tableau
          if (!Array.isArray(importedExercises)) {
            importedExercises = [importedExercises];
          }

          // Ajouter le statut de validation s'il n'existe pas
          importedExercises = importedExercises.map((ex) => ({
            ...ex,
            validationStatus: ex.validationStatus || "pending",
            tags: [], // Tags vides par défaut
            subject: ex.subject || "",
            level: ex.level || "",
            conceptName: ex.conceptName || "",
            exerciseNumber: ex.exerciseNumber || 1,
          }));

          // Fusionner avec les exercices existants (en évitant les doublons par ID)
          const mergedExercises = [...exercises];

          importedExercises.forEach((importedEx) => {
            const existingIndex = mergedExercises.findIndex(
              (ex) => ex.id === importedEx.id
            );
            if (existingIndex >= 0) {
              mergedExercises[existingIndex] = importedEx;
            } else {
              mergedExercises.push(importedEx);
            }
          });

          setExercises(mergedExercises);

          if (importedExercises.length > 0 && !currentExercise) {
            setCurrentExercise(importedExercises[0]);
          }

          showNotification(
            `${importedExercises.length} exercice(s) importé(s) avec succès !`
          );
        } catch (error) {
          console.error("Erreur lors de l'importation:", error);
          showNotification(
            "Erreur lors de l'importation : format JSON invalide",
            "error"
          );
        }
      };
      reader.readAsText(file);
    }
  };

  // Export des exercices au format JSON
  const handleExport = (exportType = "all") => {
    let exercisesToExport = [];

    switch (exportType) {
      case "filtered":
        exercisesToExport = filteredExercises;
        break;
      case "validated":
        exercisesToExport = exercises.filter(
          (ex) => ex.validationStatus === "validated"
        );
        break;
      case "pending":
        exercisesToExport = exercises.filter(
          (ex) => ex.validationStatus !== "validated"
        );
        break;
      case "selected":
        exercisesToExport = exercises.filter((ex) =>
          selectedExercises.includes(ex.id)
        );
        break;
      default:
        exercisesToExport = exercises;
    }

    if (exercisesToExport.length === 0) {
      showNotification("Aucun exercice à exporter", "error");
      return;
    }

    const dataStr = JSON.stringify(exercisesToExport, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `exercices_${exportType}_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();

    showNotification(
      `${exercisesToExport.length} exercice(s) exporté(s) avec succès !`
    );
  };

  // Création d'un nouvel exercice
  const createNewExercise = (type) => {
    let newExercise;

    switch (type) {
      case "qcm":
        newExercise = {
          id: `ex-${Date.now()}`,
          type: "qcm",
          text: "Nouvel exercice QCM",
          image: null,
          questions: [
            {
              id: `q-${Date.now()}-1`,
              text: "Nouvelle question",
              image: null,
              options: ["Option 1", "Option 2", "Option 3", "Option 4"],
              optionImages: [null, null, null, null],
              correctAnswers: ["Option 1"],
              explanation: "Explication de la réponse correcte.",
            },
          ],
          explanation: "Explication générale de l'exercice.",
          validationStatus: "pending",
          tags: [],
          subject: "",
          level: "",
          conceptName: "Nouvelle notion",
          exerciseNumber: 1,
        };
        break;

      case "fill_in_blanks_options":
        newExercise = {
          id: `ex-${Date.now()}`,
          type: "fill_in_blanks_options",
          text: "Complétez la phrase : Le ___ est un animal domestique.",
          image: null,
          blanks: [
            {
              id: `blank-${Date.now()}-1`,
              options: ["chat", "chien", "hamster", "poisson"],
              correctAnswer: "chat",
              position: 0,
            },
          ],
          explanation: "Explication de la réponse attendue.",
          validationStatus: "pending",
          tags: [],
          subject: "",
          level: "",
          conceptName: "Nouvelle notion",
          exerciseNumber: 1,
        };
        break;

      case "fill_in_blanks":
        newExercise = {
          id: `ex-${Date.now()}`,
          type: "fill_in_blanks",
          text: "Complétez la phrase : Le ___ est un animal domestique.",
          image: null,
          blanks: [
            {
              id: `blank-${Date.now()}-1`,
              correctAnswer: "chat",
              acceptableAnswers: ["félin", "matou"],
              position: 0,
            },
          ],
          explanation: "Explication de la réponse attendue.",
          validationStatus: "pending",
          tags: [],
          subject: "",
          level: "",
          conceptName: "Nouvelle notion",
          exerciseNumber: 1,
        };
        break;

      case "matching":
        newExercise = {
          id: `ex-${Date.now()}`,
          type: "matching",
          text: "Associez les éléments correspondants :",
          image: null,
          pairs: [
            {
              id: `pair-${Date.now()}-1`,
              left: "Élément 1",
              right: "Correspondance 1",
              leftImage: null,
              rightImage: null,
            },
            {
              id: `pair-${Date.now()}-2`,
              left: "Élément 2",
              right: "Correspondance 2",
              leftImage: null,
              rightImage: null,
            },
          ],
          explanation: "Explication des associations correctes.",
          validationStatus: "pending",
          tags: [],
          subject: "",
          level: "",
          conceptName: "Nouvelle notion",
          exerciseNumber: 1,
        };
        break;

      case "ordering":
        newExercise = {
          id: `ex-${Date.now()}`,
          type: "ordering",
          text: "Placez ces éléments dans le bon ordre :",
          image: null,
          items: [
            {
              id: `item-${Date.now()}-1`,
              text: "Première étape",
              position: 1,
              image: null,
            },
            {
              id: `item-${Date.now()}-2`,
              text: "Deuxième étape",
              position: 2,
              image: null,
            },
            {
              id: `item-${Date.now()}-3`,
              text: "Troisième étape",
              position: 3,
              image: null,
            },
          ],
          explanation: "Explication de l'ordre correct.",
          validationStatus: "pending",
          tags: [],
          subject: "",
          level: "",
          conceptName: "Nouvelle notion",
          exerciseNumber: 1,
        };
        break;

      default:
        return;
    }

    setExercises([...exercises, newExercise]);
    setCurrentExercise(newExercise);
    setEditMode(true);
    setPreviewMode(false);
    setShowExerciseList(false);

    showNotification("Nouvel exercice créé");
  };

  // Mise à jour d'un exercice
  const updateExercise = (updatedExercise) => {
    const updatedExercises = exercises.map((ex) =>
      ex.id === updatedExercise.id ? updatedExercise : ex
    );
    setExercises(updatedExercises);
    setCurrentExercise(updatedExercise);
    showNotification("Exercice mis à jour avec succès");
  };

  // Suppression d'un exercice
  const deleteExercise = (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet exercice ?"))
      return;

    const updatedExercises = exercises.filter((ex) => ex.id !== id);
    setExercises(updatedExercises);

    if (currentExercise && currentExercise.id === id) {
      setCurrentExercise(null);
      setShowExerciseList(true);
    }

    showNotification("Exercice supprimé");
  };

  // Supprimer les exercices sélectionnés
  const deleteSelectedExercises = () => {
    if (selectedExercises.length === 0) {
      showNotification("Aucun exercice sélectionné", "error");
      return;
    }

    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir supprimer ${selectedExercises.length} exercice(s) ?`
      )
    )
      return;

    const updatedExercises = exercises.filter(
      (ex) => !selectedExercises.includes(ex.id)
    );
    setExercises(updatedExercises);

    // Vérifier si l'exercice courant est dans les exercices supprimés
    if (currentExercise && selectedExercises.includes(currentExercise.id)) {
      if (updatedExercises.length > 0) {
        setCurrentExercise(updatedExercises[0]);
      } else {
        setCurrentExercise(null);
        setShowExerciseList(true);
      }
    }

    setSelectedExercises([]);
    showNotification(`${selectedExercises.length} exercice(s) supprimé(s)`);
  };

  // Modifier le statut de validation
  const updateValidationStatus = (id, status) => {
    const updatedExercises = exercises.map((ex) => {
      if (ex.id === id) {
        return { ...ex, validationStatus: status };
      }
      return ex;
    });

    setExercises(updatedExercises);

    if (currentExercise && currentExercise.id === id) {
      setCurrentExercise({ ...currentExercise, validationStatus: status });
    }

    showNotification(
      `Exercice marqué comme ${status === "validated" ? "validé" : "à revoir"}`
    );
  };

  // Gestion des exercices sélectionnés
  const toggleExerciseSelection = (id) => {
    if (selectedExercises.includes(id)) {
      setSelectedExercises(selectedExercises.filter((exId) => exId !== id));
    } else {
      setSelectedExercises([...selectedExercises, id]);
    }
  };

  // Sélectionner tous les exercices visibles
  const selectAllOnCurrentPage = () => {
    if (currentExercises.length === 0) return;

    const visibleExerciseIds = currentExercises.map((ex) => ex.id);

    if (visibleExerciseIds.every((id) => selectedExercises.includes(id))) {
      // Désélectionner tous les exercices visibles
      setSelectedExercises(
        selectedExercises.filter((id) => !visibleExerciseIds.includes(id))
      );
    } else {
      // Sélectionner tous les exercices visibles
      const newSelection = [...selectedExercises];

      visibleExerciseIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });

      setSelectedExercises(newSelection);
    }
  };

  // Génération de statistiques
  const stats = {
    total: exercises.length,
    validated: exercises.filter((ex) => ex.validationStatus === "validated")
      .length,
    pending: exercises.filter((ex) => ex.validationStatus !== "validated")
      .length,
    types: {
      qcm: exercises.filter((ex) => ex.type === "qcm").length,
      fill_in_blanks: exercises.filter((ex) => ex.type === "fill_in_blanks")
        .length,
      fill_in_blanks_options: exercises.filter(
        (ex) => ex.type === "fill_in_blanks_options"
      ).length,
      matching: exercises.filter((ex) => ex.type === "matching").length,
      ordering: exercises.filter((ex) => ex.type === "ordering").length,
      // Conserver la compatibilité avec les anciens types
      multiple_choice: exercises.filter((ex) => ex.type === "multiple_choice")
        .length,
      multiple_answers: exercises.filter((ex) => ex.type === "multiple_answers")
        .length,
    },
  };

  // Navigation vers un exercice (passer directement en mode prévisualisation)
  const navigateToExercise = (exercise) => {
    setCurrentExercise(exercise);
    setEditMode(false);
    setPreviewMode(true); // Directement en mode prévisualisation
    setShowExerciseList(false);
  };

  // Retour à la liste des exercices
  const backToList = () => {
    setShowExerciseList(true);
    setEditMode(false);
    setPreviewMode(false);
  };

  // Basculer entre édition et prévisualisation
  const toggleEditPreview = () => {
    setPreviewMode(!previewMode);
    setEditMode(!editMode);
  };

  return (
    <div className="app-container">
      {/* Barre d'outils principale */}
      <header className="main-header">
        <div className="header-content">
          <h1 className="app-title">Éditeur d'Exercices</h1>
          <div className="header-actions">
            <label className="btn btn-primary btn-import">
              <Upload size={18} className="icon" />
              <span>Importer</span>
              <input
                type="file"
                accept=".json"
                className="hidden-input"
                onChange={handleImport}
              />
            </label>

            <div className="dropdown">
              <button
                className="btn btn-primary"
                onClick={() => {
                  const dropdown = document.getElementById("exportDropdown");
                  if (dropdown) {
                    dropdown.classList.toggle("show");
                  }
                }}
              >
                <Download size={18} className="icon" />
                <span>Exporter</span>
              </button>

              <div id="exportDropdown" className="dropdown-content">
                <button
                  className="dropdown-item"
                  onClick={() => handleExport("all")}
                  disabled={exercises.length === 0}
                >
                  Tous les exercices
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => handleExport("filtered")}
                  disabled={filteredExercises.length === 0}
                >
                  Exercices filtrés ({filteredExercises.length})
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => handleExport("selected")}
                  disabled={selectedExercises.length === 0}
                >
                  Exercices sélectionnés ({selectedExercises.length})
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => handleExport("validated")}
                  disabled={stats.validated === 0}
                >
                  Exercices validés ({stats.validated})
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => handleExport("pending")}
                  disabled={stats.pending === 0}
                >
                  Exercices à revoir ({stats.pending})
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="main-content">
        {showExerciseList ? (
          <>
            {/* Barre de recherche et filtres */}
            <div className="search-filter-container">
              <div className="search-container">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Rechercher un exercice..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button
                className={`btn btn-filter ${showFilters ? "active" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} className="icon" />
                <span>Filtres</span>
              </button>

              <button
                className={`btn ${
                  selectMode ? "btn-primary" : "btn-secondary"
                }`}
                onClick={() => setSelectMode(!selectMode)}
              >
                {selectMode ? "Terminer sélection" : "Sélection multiple"}
              </button>

              {selectMode && selectedExercises.length > 0 && (
                <button
                  className="btn btn-danger"
                  onClick={deleteSelectedExercises}
                >
                  <Trash size={18} className="icon" />
                  Supprimer ({selectedExercises.length})
                </button>
              )}
            </div>

            {/* Panneau de filtres */}
            {showFilters && (
              <div className="filters-panel">
                <div className="filters-grid">
                  <div className="filter-group">
                    <label className="filter-label">Type d'exercice</label>
                    <select
                      className="filter-select"
                      value={filters.type}
                      onChange={(e) =>
                        setFilters({ ...filters, type: e.target.value })
                      }
                    >
                      <option value="all">Tous les types</option>
                      <option value="qcm">
                        QCM (une ou plusieurs questions)
                      </option>
                      <option value="fill_in_blanks">Texte à trous</option>
                      <option value="fill_in_blanks_options">
                        Texte à trous avec options
                      </option>
                      <option value="matching">Association</option>
                      <option value="ordering">Mise en ordre</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Statut de validation</label>
                    <select
                      className="filter-select"
                      value={filters.validationStatus}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          validationStatus: e.target.value,
                        })
                      }
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="validated">Validés</option>
                      <option value="pending">À revoir</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Matière</label>
                    <select
                      className="filter-select"
                      value={filters.subject}
                      onChange={(e) =>
                        setFilters({ ...filters, subject: e.target.value })
                      }
                    >
                      <option value="all">Toutes les matières</option>
                      {allSubjects.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Niveau</label>
                    <select
                      className="filter-select"
                      value={filters.level}
                      onChange={(e) =>
                        setFilters({ ...filters, level: e.target.value })
                      }
                    >
                      <option value="all">Tous les niveaux</option>
                      {allLevels.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sort-controls">
                  <label className="filter-label">Trier par :</label>
                  <select
                    className="filter-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="conceptName">Nom de la notion</option>
                    <option value="subject">Matière</option>
                    <option value="level">Niveau</option>
                    <option value="exerciseNumber">Numéro d'exercice</option>
                  </select>

                  <button
                    className="btn btn-text"
                    onClick={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                  >
                    {sortOrder === "asc" ? "↑ Croissant" : "↓ Décroissant"}
                  </button>
                </div>

                <div className="filters-footer">
                  <div className="filter-result-count">
                    {filteredExercises.length} exercice(s) trouvé(s)
                  </div>

                  <button
                    className="btn btn-text"
                    onClick={() => {
                      setFilters({
                        type: "all",
                        validationStatus: "all",
                        subject: "all",
                        level: "all",
                      });
                      setSearchTerm("");
                    }}
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            )}

            {/* Liste et statistiques */}
            <div className="dashboard-layout">
              {/* Panneau statistiques */}
              <div className="stats-panel">
                <h2 className="panel-title">Statistiques</h2>
                <div className="stats-container">
                  <div className="stat-item">
                    <span className="stat-label">Total des exercices</span>
                    <span className="stat-value">{stats.total}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Exercices validés</span>
                    <span className="stat-value success">
                      {stats.validated}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Exercices à revoir</span>
                    <span className="stat-value warning">{stats.pending}</span>
                  </div>

                  <div className="stat-divider"></div>

                  <div className="stat-subtitle">Par type</div>
                  <div className="stat-item small">
                    <span className="stat-label">
                      QCM (une ou plusieurs questions)
                    </span>
                    <span className="stat-value small">{stats.types.qcm}</span>
                  </div>
                  <div className="stat-item small">
                    <span className="stat-label">Texte à trous</span>
                    <span className="stat-value small">
                      {stats.types.fill_in_blanks}
                    </span>
                  </div>
                  <div className="stat-item small">
                    <span className="stat-label">
                      Texte à trous avec options
                    </span>
                    <span className="stat-value small">
                      {stats.types.fill_in_blanks_options}
                    </span>
                  </div>
                  <div className="stat-item small">
                    <span className="stat-label">Association</span>
                    <span className="stat-value small">
                      {stats.types.matching}
                    </span>
                  </div>
                  <div className="stat-item small">
                    <span className="stat-label">Mise en ordre</span>
                    <span className="stat-value small">
                      {stats.types.ordering}
                    </span>
                  </div>
                  {stats.types.multiple_choice > 0 && (
                    <div className="stat-item small">
                      <span className="stat-label">
                        QCM (ancien format - réponse unique)
                      </span>
                      <span className="stat-value small">
                        {stats.types.multiple_choice}
                      </span>
                    </div>
                  )}
                  {stats.types.multiple_answers > 0 && (
                    <div className="stat-item small">
                      <span className="stat-label">
                        QCM (ancien format - réponses multiples)
                      </span>
                      <span className="stat-value small">
                        {stats.types.multiple_answers}
                      </span>
                    </div>
                  )}
                </div>

                <div className="creation-container">
                  <h3 className="creation-title">Créer un exercice</h3>
                  <div className="creation-buttons">
                    <button
                      className="btn btn-create"
                      onClick={() => createNewExercise("qcm")}
                    >
                      <Plus size={16} className="icon" />
                      QCM (une ou plusieurs questions)
                    </button>
                    <button
                      className="btn btn-create"
                      onClick={() =>
                        createNewExercise("fill_in_blanks_options")
                      }
                    >
                      <Plus size={16} className="icon" />
                      Texte à trous avec options
                    </button>
                    <button
                      className="btn btn-create"
                      onClick={() => createNewExercise("fill_in_blanks")}
                    >
                      <Plus size={16} className="icon" />
                      Texte à trous
                    </button>
                    <button
                      className="btn btn-create"
                      onClick={() => createNewExercise("matching")}
                    >
                      <Plus size={16} className="icon" />
                      Association
                    </button>
                    <button
                      className="btn btn-create"
                      onClick={() => createNewExercise("ordering")}
                    >
                      <Plus size={16} className="icon" />
                      Mise en ordre
                    </button>
                  </div>
                </div>
              </div>

              {/* Liste des exercices */}
              <div className="exercise-panel">
                <h2 className="panel-title">Liste des exercices</h2>

                {selectMode && currentExercises.length > 0 && (
                  <div className="exercise-list-header">
                    <div className="select-all">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={
                          currentExercises.length > 0 &&
                          currentExercises.every((ex) =>
                            selectedExercises.includes(ex.id)
                          )
                        }
                        onChange={selectAllOnCurrentPage}
                      />
                      <span className="select-all-label">
                        Tout sélectionner
                      </span>
                    </div>
                  </div>
                )}

                <div className="exercise-list">
                  {currentExercises.length > 0 ? (
                    currentExercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        className={`exercise-item ${
                          exercise.validationStatus === "validated"
                            ? "validated"
                            : "pending"
                        }`}
                        onClick={() => {
                          if (selectMode) {
                            toggleExerciseSelection(exercise.id);
                          } else {
                            navigateToExercise(exercise);
                          }
                        }}
                      >
                        {selectMode && (
                          <div className="exercise-select">
                            <input
                              type="checkbox"
                              checked={selectedExercises.includes(exercise.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleExerciseSelection(exercise.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}

                        <div className="exercise-content">
                          <div className="exercise-header">
                            <div className="exercise-type-label">
                              {getExerciseTypeLabel(exercise.type)}
                            </div>
                            <div className="exercise-actions">
                              {exercise.validationStatus === "validated" ? (
                                <span className="validation-badge validated">
                                  <Check size={14} className="icon" />
                                  Validé
                                </span>
                              ) : (
                                <span className="validation-badge pending">
                                  <AlertTriangle size={14} className="icon" />À
                                  revoir
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="exercise-metadata">
                            {exercise.subject && (
                              <span className="metadata-item subject">
                                {exercise.subject}
                              </span>
                            )}
                            {exercise.level && (
                              <span className="metadata-item level">
                                {exercise.level}
                              </span>
                            )}
                            {exercise.conceptName && (
                              <span className="metadata-item concept">
                                <strong>{exercise.conceptName}</strong>
                                {exercise.exerciseNumber &&
                                  ` (Ex. ${exercise.exerciseNumber})`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-list">
                      <FileText size={32} className="empty-icon" />
                      <p>Aucun exercice trouvé</p>
                      <p className="empty-tip">
                        Créez un nouvel exercice ou modifiez vos filtres
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Affichage d'un exercice spécifique */}
            {currentExercise && (
              <div className="exercise-detail">
                {/* En-tête avec navigation */}
                <div className="exercise-detail-header">
                  <button className="btn btn-back" onClick={backToList}>
                    <Home size={18} className="icon" />
                    Retour à la liste
                  </button>

                  <div className="exercise-header-info">
                    <h2 className="exercise-type">
                      {getExerciseTypeLabel(currentExercise.type)}
                    </h2>

                    {currentExercise.validationStatus === "validated" ? (
                      <span className="validation-badge validated">
                        <Check size={14} className="icon" />
                        Validé
                      </span>
                    ) : (
                      <span className="validation-badge pending">
                        <AlertTriangle size={14} className="icon" />À revoir
                      </span>
                    )}
                  </div>

                  <div className="exercise-actions">
                    {/* Bouton unique pour basculer entre édition et prévisualisation */}
                    <button
                      className="btn btn-primary"
                      onClick={toggleEditPreview}
                    >
                      {previewMode ? (
                        <>
                          <Edit size={16} className="icon" />
                          <span>Éditer</span>
                        </>
                      ) : (
                        <>
                          <Eye size={16} className="icon" />
                          <span>Prévisualiser</span>
                        </>
                      )}
                    </button>

                    {currentExercise.validationStatus === "validated" ? (
                      <button
                        className="btn btn-warning"
                        onClick={() =>
                          updateValidationStatus(currentExercise.id, "pending")
                        }
                      >
                        <AlertTriangle size={16} className="icon" />
                        <span>Marquer à revoir</span>
                      </button>
                    ) : (
                      <button
                        className="btn btn-success"
                        onClick={() =>
                          updateValidationStatus(
                            currentExercise.id,
                            "validated"
                          )
                        }
                      >
                        <Check size={16} className="icon" />
                        <span>Valider</span>
                      </button>
                    )}

                    <button
                      className="btn btn-danger"
                      onClick={() => deleteExercise(currentExercise.id)}
                    >
                      <Trash size={16} className="icon" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>

                {/* Contenu de l'exercice */}
                <div className="exercise-detail-content">
                  {editMode && (
                    <ExerciseEditForm
                      exercise={currentExercise}
                      onUpdate={updateExercise}
                    />
                  )}
                  {previewMode && (
                    <ExercisePreview exercise={currentExercise} />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

// Utilitaire pour obtenir le label du type d'exercice
const getExerciseTypeLabel = (type) => {
  switch (type) {
    case "qcm":
      return "QCM (une ou plusieurs questions)";
    case "fill_in_blanks":
      return "Texte à trous";
    case "fill_in_blanks_options":
      return "Texte à trous avec options";
    case "matching":
      return "Association";
    case "ordering":
      return "Mise en ordre";
    // Types originaux à conserver pour la compatibilité
    case "multiple_choice":
      return "QCM (réponse unique)";
    case "multiple_answers":
      return "QCM (réponses multiples)";
    default:
      return "Exercice";
  }
};

// Formulaire d'édition d'exercice
const ExerciseEditForm = ({ exercise, onUpdate }) => {
  const [formState, setFormState] = useState(exercise);

  useEffect(() => {
    setFormState(exercise);
  }, [exercise]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState({
      ...formState,
      [name]: value,
    });
  };

  const handleImageChange = (imageUrl) => {
    setFormState({
      ...formState,
      image: imageUrl,
    });
  };

  const updateExercise = () => {
    onUpdate(formState);
  };

  // Gestion des QCM à questions multiples
  const handleQuestionChange = (questionIndex, field, value) => {
    const updatedQuestions = [...formState.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      [field]: value,
    };

    setFormState({
      ...formState,
      questions: updatedQuestions,
    });
  };

  const handleQuestionImageChange = (questionIndex, imageUrl) => {
    const updatedQuestions = [...formState.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      image: imageUrl,
    };

    setFormState({
      ...formState,
      questions: updatedQuestions,
    });
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...formState.questions];
    const updatedOptions = [...updatedQuestions[questionIndex].options];
    updatedOptions[optionIndex] = value;

    // Si l'option modifiée est une réponse correcte, mettre à jour correctAnswers
    const correctAnswers = updatedQuestions[questionIndex].correctAnswers;
    const oldOption = updatedQuestions[questionIndex].options[optionIndex];

    if (correctAnswers.includes(oldOption)) {
      const updatedCorrectAnswers = correctAnswers.map((ans) =>
        ans === oldOption ? value : ans
      );

      updatedQuestions[questionIndex] = {
        ...updatedQuestions[questionIndex],
        options: updatedOptions,
        correctAnswers: updatedCorrectAnswers,
      };
    } else {
      updatedQuestions[questionIndex] = {
        ...updatedQuestions[questionIndex],
        options: updatedOptions,
      };
    }

    setFormState({
      ...formState,
      questions: updatedQuestions,
    });
  };

  const handleOptionImageChange = (questionIndex, optionIndex, imageUrl) => {
    const updatedQuestions = [...formState.questions];

    // Initialiser optionImages s'il n'existe pas déjà
    if (!updatedQuestions[questionIndex].optionImages) {
      updatedQuestions[questionIndex].optionImages = updatedQuestions[
        questionIndex
      ].options.map(() => null);
    }

    const updatedOptionImages = [
      ...updatedQuestions[questionIndex].optionImages,
    ];
    updatedOptionImages[optionIndex] = imageUrl;

    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      optionImages: updatedOptionImages,
    };

    setFormState({
      ...formState,
      questions: updatedQuestions,
    });
  };

  const handleCorrectAnswerToggle = (questionIndex, option) => {
    const updatedQuestions = [...formState.questions];
    let correctAnswers = [...updatedQuestions[questionIndex].correctAnswers];

    if (correctAnswers.includes(option)) {
      correctAnswers = correctAnswers.filter((ans) => ans !== option);
    } else {
      correctAnswers.push(option);
    }

    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      correctAnswers: correctAnswers,
    };

    setFormState({
      ...formState,
      questions: updatedQuestions,
    });
  };

  const addOption = (questionIndex) => {
    const updatedQuestions = [...formState.questions];
    const options = [...updatedQuestions[questionIndex].options];

    // Aussi ajouter un emplacement pour l'image de l'option
    let optionImages = updatedQuestions[questionIndex].optionImages || [];
    optionImages = [...optionImages, null];

    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      options: [...options, `Option ${options.length + 1}`],
      optionImages: optionImages,
    };

    setFormState({
      ...formState,
      questions: updatedQuestions,
    });
  };

  const removeOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...formState.questions];
    const options = [...updatedQuestions[questionIndex].options];
    const optionToRemove = options[optionIndex];

    // Filtrer l'option supprimée
    const filteredOptions = options.filter((_, i) => i !== optionIndex);

    // Filtrer aussi l'image de l'option si elle existe
    let filteredOptionImages =
      updatedQuestions[questionIndex].optionImages || [];
    if (filteredOptionImages.length > 0) {
      filteredOptionImages = filteredOptionImages.filter(
        (_, i) => i !== optionIndex
      );
    }

    // Mettre à jour les réponses correctes si nécessaire
    let correctAnswers = [...updatedQuestions[questionIndex].correctAnswers];
    if (correctAnswers.includes(optionToRemove)) {
      correctAnswers = correctAnswers.filter((ans) => ans !== optionToRemove);
    }

    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      options: filteredOptions,
      optionImages: filteredOptionImages,
      correctAnswers: correctAnswers,
    };

    setFormState({
      ...formState,
      questions: updatedQuestions,
    });
  };

  const addQuestion = () => {
    const newQuestion = {
      id: `q-${Date.now()}`,
      text: "Nouvelle question",
      options: ["Option 1", "Option 2", "Option 3", "Option 4"],
      optionImages: [null, null, null, null], // Images pour chaque option
      correctAnswers: ["Option 1"],
      explanation: "Explication de la réponse correcte.",
      image: null, // Image de la question
    };

    setFormState({
      ...formState,
      questions: [...formState.questions, newQuestion],
    });
  };

  const removeQuestion = (questionIndex) => {
    const updatedQuestions = formState.questions.filter(
      (_, i) => i !== questionIndex
    );
    setFormState({
      ...formState,
      questions: updatedQuestions,
    });
  };

  // Gestion des trous avec options
  const handleBlankOptionsChange = (blankIndex, field, value) => {
    const updatedBlanks = [...formState.blanks];

    if (field === "options") {
      // Dans ce cas, value est l'index de l'option et newValue est la nouvelle valeur
      const { optionIndex, newValue } = value;
      const options = [...updatedBlanks[blankIndex].options];
      options[optionIndex] = newValue;

      updatedBlanks[blankIndex] = {
        ...updatedBlanks[blankIndex],
        options: options,
      };
    } else {
      updatedBlanks[blankIndex] = {
        ...updatedBlanks[blankIndex],
        [field]: value,
      };
    }

    setFormState({
      ...formState,
      blanks: updatedBlanks,
    });
  };

  const addBlankOption = (blankIndex) => {
    const updatedBlanks = [...formState.blanks];
    const options = [...updatedBlanks[blankIndex].options];

    updatedBlanks[blankIndex] = {
      ...updatedBlanks[blankIndex],
      options: [...options, `Option ${options.length + 1}`],
    };

    setFormState({
      ...formState,
      blanks: updatedBlanks,
    });
  };

  const removeBlankOption = (blankIndex, optionIndex) => {
    const updatedBlanks = [...formState.blanks];
    const options = [...updatedBlanks[blankIndex].options];

    // Vérifier si on supprime l'option correcte
    const optionToRemove = options[optionIndex];
    const isCorrectOption =
      optionToRemove === updatedBlanks[blankIndex].correctAnswer;

    const filteredOptions = options.filter((_, i) => i !== optionIndex);

    updatedBlanks[blankIndex] = {
      ...updatedBlanks[blankIndex],
      options: filteredOptions,
      // Si on supprime l'option correcte, définir la première option restante comme correcte
      correctAnswer:
        isCorrectOption && filteredOptions.length > 0
          ? filteredOptions[0]
          : updatedBlanks[blankIndex].correctAnswer,
    };

    setFormState({
      ...formState,
      blanks: updatedBlanks,
    });
  };

  const addBlankWithOptions = () => {
    setFormState({
      ...formState,
      blanks: [
        ...formState.blanks,
        {
          id: `blank-${Date.now()}`,
          options: ["Option 1", "Option 2", "Option 3", "Option 4"],
          correctAnswer: "Option 1",
          position: formState.blanks.length,
        },
      ],
    });
  };

  // Gestion des blancs pour texte à trous
  const handleBlankChange = (index, field, value) => {
    const updatedBlanks = [...formState.blanks];
    updatedBlanks[index] = {
      ...updatedBlanks[index],
      [field]: value,
    };
    setFormState({
      ...formState,
      blanks: updatedBlanks,
    });
  };

  const handleAcceptableAnswerChange = (blankIndex, answerIndex, value) => {
    const updatedBlanks = [...formState.blanks];
    const updatedAcceptableAnswers = [
      ...updatedBlanks[blankIndex].acceptableAnswers,
    ];
    updatedAcceptableAnswers[answerIndex] = value;

    updatedBlanks[blankIndex] = {
      ...updatedBlanks[blankIndex],
      acceptableAnswers: updatedAcceptableAnswers,
    };

    setFormState({
      ...formState,
      blanks: updatedBlanks,
    });
  };

  const addBlank = () => {
    setFormState({
      ...formState,
      blanks: [
        ...formState.blanks,
        {
          id: `blank-${Date.now()}`,
          correctAnswer: "",
          acceptableAnswers: [],
          position: formState.blanks.length,
        },
      ],
    });
  };

  const removeBlank = (index) => {
    const updatedBlanks = formState.blanks.filter((_, i) => i !== index);
    // Réajuster les positions
    updatedBlanks.forEach((blank, i) => {
      blank.position = i;
    });

    setFormState({
      ...formState,
      blanks: updatedBlanks,
    });
  };

  const addAcceptableAnswer = (blankIndex) => {
    const updatedBlanks = [...formState.blanks];
    updatedBlanks[blankIndex] = {
      ...updatedBlanks[blankIndex],
      acceptableAnswers: [...updatedBlanks[blankIndex].acceptableAnswers, ""],
    };

    setFormState({
      ...formState,
      blanks: updatedBlanks,
    });
  };

  const removeAcceptableAnswer = (blankIndex, answerIndex) => {
    const updatedBlanks = [...formState.blanks];
    updatedBlanks[blankIndex] = {
      ...updatedBlanks[blankIndex],
      acceptableAnswers: updatedBlanks[blankIndex].acceptableAnswers.filter(
        (_, i) => i !== answerIndex
      ),
    };

    setFormState({
      ...formState,
      blanks: updatedBlanks,
    });
  };

  // Gestion des paires pour association
  const handlePairChange = (index, side, value) => {
    const updatedPairs = [...formState.pairs];
    updatedPairs[index] = {
      ...updatedPairs[index],
      [side]: value,
    };

    setFormState({
      ...formState,
      pairs: updatedPairs,
    });
  };

  const handlePairImageChange = (index, side, imageUrl) => {
    const updatedPairs = [...formState.pairs];
    updatedPairs[index] = {
      ...updatedPairs[index],
      [`${side}Image`]: imageUrl,
    };

    setFormState({
      ...formState,
      pairs: updatedPairs,
    });
  };

  const addPair = () => {
    setFormState({
      ...formState,
      pairs: [
        ...formState.pairs,
        {
          id: `pair-${Date.now()}`,
          left: `Élément ${formState.pairs.length + 1}`,
          right: `Correspondance ${formState.pairs.length + 1}`,
          leftImage: null,
          rightImage: null,
        },
      ],
    });
  };

  const removePair = (index) => {
    setFormState({
      ...formState,
      pairs: formState.pairs.filter((_, i) => i !== index),
    });
  };

  // Gestion des items pour mise en ordre
  const handleOrderItemChange = (index, field, value) => {
    const updatedItems = [...formState.items];

    if (field === "position") {
      value = parseInt(value);
    }

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    setFormState({
      ...formState,
      items: updatedItems,
    });
  };

  const handleOrderItemImageChange = (index, imageUrl) => {
    const updatedItems = [...formState.items];
    updatedItems[index] = {
      ...updatedItems[index],
      image: imageUrl,
    };

    setFormState({
      ...formState,
      items: updatedItems,
    });
  };

  const addOrderItem = () => {
    setFormState({
      ...formState,
      items: [
        ...formState.items,
        {
          id: `item-${Date.now()}`,
          text: `Étape ${formState.items.length + 1}`,
          position: formState.items.length + 1,
          image: null,
        },
      ],
    });
  };

  const removeOrderItem = (index) => {
    const updatedItems = formState.items.filter((_, i) => i !== index);
    // Réajuster les positions
    updatedItems.forEach((item, i) => {
      if (item.position > formState.items[index].position) {
        item.position -= 1;
      }
    });

    setFormState({
      ...formState,
      items: updatedItems,
    });
  };

  return (
    <div className="edit-form">
      <div className="form-card">
        <div className="metadata-form-row">
          <div className="form-group half">
            <label className="form-label">Matière</label>
            <select
              name="subject"
              className="form-select"
              value={formState.subject}
              onChange={handleChange}
            >
              <option value="">Sélectionnez une matière</option>
              {allSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group half">
            <label className="form-label">Niveau</label>
            <select
              name="level"
              className="form-select"
              value={formState.level}
              onChange={handleChange}
            >
              <option value="">Sélectionnez un niveau</option>
              {allLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="metadata-form-row">
          <div className="form-group two-thirds">
            <label className="form-label">Nom de la notion</label>
            <input
              type="text"
              name="conceptName"
              className="form-input"
              value={formState.conceptName}
              onChange={handleChange}
              placeholder="Ex: Accord sujet-verbe, Théorème de Pythagore..."
            />
          </div>

          <div className="form-group one-third">
            <label className="form-label">Numéro d'exercice</label>
            <input
              type="number"
              name="exerciseNumber"
              className="form-input"
              value={formState.exerciseNumber}
              onChange={(e) =>
                handleChange({
                  target: {
                    name: "exerciseNumber",
                    value: parseInt(e.target.value) || 1,
                  },
                })
              }
              min="1"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Énoncé de l'exercice</label>
          <div className="help-box">
            <p className="help-text">
              Vous pouvez utiliser des expressions mathématiques avec la syntaxe
              LaTeX entre $...$ Exemple: $x^2 + 2x + 1$
            </p>
          </div>
          <textarea
            name="text"
            className="form-textarea"
            rows="3"
            value={formState.text}
            onChange={handleChange}
          />
          <div className="latex-preview">
            <label className="form-label">Aperçu:</label>
            <div className="preview-box">
              <LatexRenderer text={formState.text} />
            </div>
          </div>
        </div>

        {/* Image de l'exercice */}
        <div className="form-group">
          <ImageUploader
            currentImageUrl={formState.image}
            onImageChange={handleImageChange}
            label="Image de l'exercice (optionnelle)"
            previewSize="medium"
          />
        </div>

        {/* Éditeur spécifique selon le type d'exercice */}
        {formState.type === "qcm" && (
          <div className="form-section">
            <div className="section-header">
              <h3 className="section-title">Questions</h3>
              <button
                type="button"
                className="btn btn-add"
                onClick={addQuestion}
              >
                <Plus size={16} className="icon" /> Ajouter une question
              </button>
            </div>

            {formState.questions.map((question, qIndex) => (
              <div key={question.id} className="question-item">
                <div className="question-header">
                  <h4 className="question-title">Question #{qIndex + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="btn btn-remove"
                    disabled={formState.questions.length <= 1}
                  >
                    <Trash size={16} className="icon" />
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Texte de la question</label>
                  <textarea
                    value={question.text}
                    onChange={(e) =>
                      handleQuestionChange(qIndex, "text", e.target.value)
                    }
                    className="form-textarea"
                    placeholder="Texte de la question"
                  />
                  <div className="latex-preview">
                    <label className="form-label">Aperçu:</label>
                    <div className="preview-box">
                      <LatexRenderer text={question.text} />
                    </div>
                  </div>
                </div>

                {/* Image de la question */}
                <div className="form-group">
                  <ImageUploader
                    currentImageUrl={question.image}
                    onImageChange={(url) =>
                      handleQuestionImageChange(qIndex, url)
                    }
                    label="Image de la question (optionnelle)"
                    previewSize="medium"
                  />
                </div>

                <div className="form-group">
                  <div className="section-header">
                    <h3 className="section-title">Options</h3>
                    <button
                      type="button"
                      className="btn btn-add"
                      onClick={() => addOption(qIndex)}
                    >
                      <Plus size={16} className="icon" /> Ajouter une option
                    </button>
                  </div>

                  <div className="options-list">
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="option-item">
                        <input
                          type="checkbox"
                          checked={question.correctAnswers.includes(option)}
                          onChange={() =>
                            handleCorrectAnswerToggle(qIndex, option)
                          }
                          className="option-checkbox"
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) =>
                            handleOptionChange(qIndex, optIndex, e.target.value)
                          }
                          className="option-input"
                        />
                        <div className="latex-preview small">
                          <LatexRenderer text={option} />
                        </div>

                        {/* Image de l'option */}
                        <div className="option-image-upload mt-2">
                          <ImageUploader
                            currentImageUrl={
                              question.optionImages &&
                              question.optionImages[optIndex]
                            }
                            onImageChange={(url) =>
                              handleOptionImageChange(qIndex, optIndex, url)
                            }
                            label={`Image pour l'option ${optIndex + 1}`}
                            previewSize="small"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeOption(qIndex, optIndex)}
                          className="btn btn-remove"
                          disabled={question.options.length <= 2}
                        >
                          <Trash size={16} className="icon" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Explication (pour cette question)
                  </label>
                  <textarea
                    value={question.explanation}
                    onChange={(e) =>
                      handleQuestionChange(
                        qIndex,
                        "explanation",
                        e.target.value
                      )
                    }
                    className="form-textarea"
                    placeholder="Explication de la réponse correcte"
                  />
                  <div className="latex-preview">
                    <label className="form-label">Aperçu:</label>
                    <div className="preview-box">
                      <LatexRenderer text={question.explanation} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {formState.type === "fill_in_blanks_options" && (
          <div className="form-section">
            <div className="help-box">
              <p className="help-text">
                Conseil : Dans l'énoncé, utilisez des tirets bas "_" pour
                indiquer l'emplacement des trous. Par exemple : "Le chat ___ sur
                le toit." créera un trou à remplir.
              </p>
            </div>

            {/* Image de l'exercice */}
            <div className="form-group">
              <ImageUploader
                currentImageUrl={formState.image}
                onImageChange={handleImageChange}
                label="Image de l'exercice (optionnelle)"
                previewSize="medium"
              />
            </div>

            <div className="section-header">
              <h3 className="section-title">Trous à remplir (avec options)</h3>
              <button
                type="button"
                className="btn btn-add"
                onClick={addBlankWithOptions}
              >
                <Plus size={16} className="icon" /> Ajouter un trou
              </button>
            </div>

            <div className="blanks-list">
              {formState.blanks.map((blank, blankIndex) => (
                <div key={blank.id} className="blank-item">
                  <div className="blank-header">
                    <h4 className="blank-title">Trou #{blankIndex + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeBlank(blankIndex)}
                      className="btn btn-remove"
                    >
                      <Trash size={16} className="icon" />
                    </button>
                  </div>

                  <div className="blank-field">
                    <label className="blank-label">
                      Position du trou (dans l'ordre d'apparition des "_")
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={blank.position}
                      onChange={(e) =>
                        handleBlankOptionsChange(
                          blankIndex,
                          "position",
                          parseInt(e.target.value)
                        )
                      }
                      className="blank-input"
                    />
                  </div>

                  <div className="blank-field">
                    <label className="blank-label">Options disponibles</label>
                    <div className="options-list">
                      {blank.options.map((option, optIndex) => (
                        <div key={optIndex} className="option-item">
                          <input
                            type="radio"
                            checked={blank.correctAnswer === option}
                            onChange={() =>
                              handleBlankOptionsChange(
                                blankIndex,
                                "correctAnswer",
                                option
                              )
                            }
                            className="option-radio"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) =>
                              handleBlankOptionsChange(blankIndex, "options", {
                                optionIndex: optIndex,
                                newValue: e.target.value,
                              })
                            }
                            className="option-input"
                          />
                          <div className="latex-preview small">
                            <LatexRenderer text={option} />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              removeBlankOption(blankIndex, optIndex)
                            }
                            className="btn btn-remove"
                            disabled={blank.options.length <= 2}
                          >
                            <Trash size={16} className="icon" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-add-small"
                      onClick={() => addBlankOption(blankIndex)}
                    >
                      <Plus size={14} className="icon" /> Ajouter une option
                    </button>
                  </div>
                </div>
              ))}
              {formState.blanks.length === 0 && (
                <p className="no-blanks">
                  Aucun trou défini. Ajoutez-en un avec le bouton ci-dessus.
                </p>
              )}
            </div>
          </div>
        )}

        {formState.type === "fill_in_blanks" && (
          <div className="form-section">
            <div className="help-box">
              <p className="help-text">
                Conseil : Dans l'énoncé, utilisez des tirets bas "_" pour
                indiquer l'emplacement des trous. Par exemple : "Le chat ___ sur
                le toit." créera un trou à remplir.
              </p>
            </div>

            {/* Image de l'exercice */}
            <div className="form-group">
              <ImageUploader
                currentImageUrl={formState.image}
                onImageChange={handleImageChange}
                label="Image de l'exercice (optionnelle)"
                previewSize="medium"
              />
            </div>

            <div className="section-header">
              <h3 className="section-title">Trous à remplir</h3>
              <button type="button" className="btn btn-add" onClick={addBlank}>
                <Plus size={16} className="icon" /> Ajouter un trou
              </button>
            </div>

            <div className="blanks-list">
              {formState.blanks.map((blank, blankIndex) => (
                <div key={blank.id} className="blank-item">
                  <div className="blank-header">
                    <h4 className="blank-title">Trou #{blankIndex + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeBlank(blankIndex)}
                      className="btn btn-remove"
                    >
                      <Trash size={16} className="icon" />
                    </button>
                  </div>

                  <div className="blank-field">
                    <label className="blank-label">
                      Position du trou (dans l'ordre d'apparition des "_")
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={blank.position}
                      onChange={(e) =>
                        handleBlankChange(
                          blankIndex,
                          "position",
                          parseInt(e.target.value)
                        )
                      }
                      className="blank-input"
                    />
                  </div>

                  <div className="blank-field">
                    <label className="blank-label">Réponse correcte</label>
                    <input
                      type="text"
                      value={blank.correctAnswer}
                      onChange={(e) =>
                        handleBlankChange(
                          blankIndex,
                          "correctAnswer",
                          e.target.value
                        )
                      }
                      className="blank-input"
                    />
                  </div>

                  <div className="blank-acceptable-answers">
                    <div className="acceptable-header">
                      <label className="blank-label">
                        Réponses alternatives acceptables
                      </label>
                      <button
                        type="button"
                        className="btn btn-add-small"
                        onClick={() => addAcceptableAnswer(blankIndex)}
                      >
                        <Plus size={12} className="icon" /> Ajouter
                      </button>
                    </div>

                    <div className="acceptable-list">
                      {blank.acceptableAnswers.map((answer, answerIndex) => (
                        <div key={answerIndex} className="acceptable-item">
                          <input
                            type="text"
                            value={answer}
                            onChange={(e) =>
                              handleAcceptableAnswerChange(
                                blankIndex,
                                answerIndex,
                                e.target.value
                              )
                            }
                            className="acceptable-input"
                            placeholder="Réponse alternative"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              removeAcceptableAnswer(blankIndex, answerIndex)
                            }
                            className="btn btn-remove"
                          >
                            <Trash size={16} className="icon" />
                          </button>
                        </div>
                      ))}
                      {blank.acceptableAnswers.length === 0 && (
                        <p className="no-alternatives">
                          Aucune réponse alternative définie
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {formState.blanks.length === 0 && (
                <p className="no-blanks">
                  Aucun trou défini. Ajoutez-en un avec le bouton ci-dessus.
                </p>
              )}
            </div>
          </div>
        )}

        {formState.type === "matching" && (
          <div className="form-section">
            <div className="section-header">
              <h3 className="section-title">Paires à associer</h3>
              <button type="button" className="btn btn-add" onClick={addPair}>
                <Plus size={16} className="icon" /> Ajouter une paire
              </button>
            </div>

            {/* Image de l'exercice */}
            <div className="form-group">
              <ImageUploader
                currentImageUrl={formState.image}
                onImageChange={handleImageChange}
                label="Image de l'exercice (optionnelle)"
                previewSize="medium"
              />
            </div>

            <div className="pairs-list">
              {formState.pairs.map((pair, index) => (
                <div key={pair.id} className="pair-item">
                  <div className="pair-with-content">
                    <input
                      type="text"
                      value={pair.left}
                      onChange={(e) =>
                        handlePairChange(index, "left", e.target.value)
                      }
                      className="pair-input"
                      placeholder="Élément gauche"
                    />

                    {/* Image pour l'élément gauche */}
                    <ImageUploader
                      currentImageUrl={pair.leftImage}
                      onImageChange={(url) =>
                        handlePairImageChange(index, "left", url)
                      }
                      label="Image (optionnelle)"
                      previewSize="small"
                    />
                  </div>

                  <span className="pair-arrow">→</span>

                  <div className="pair-with-content">
                    <input
                      type="text"
                      value={pair.right}
                      onChange={(e) =>
                        handlePairChange(index, "right", e.target.value)
                      }
                      className="pair-input"
                      placeholder="Élément droit"
                    />

                    {/* Image pour l'élément droit */}
                    <ImageUploader
                      currentImageUrl={pair.rightImage}
                      onImageChange={(url) =>
                        handlePairImageChange(index, "right", url)
                      }
                      label="Image (optionnelle)"
                      previewSize="small"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removePair(index)}
                    className="btn btn-remove"
                    disabled={formState.pairs.length <= 1}
                  >
                    <Trash size={16} className="icon" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {formState.type === "ordering" && (
          <div className="form-section">
            <div className="section-header">
              <h3 className="section-title">Éléments à ordonner</h3>
              <button
                type="button"
                className="btn btn-add"
                onClick={addOrderItem}
              >
                <Plus size={16} className="icon" /> Ajouter un élément
              </button>
            </div>

            {/* Image de l'exercice */}
            <div className="form-group">
              <ImageUploader
                currentImageUrl={formState.image}
                onImageChange={handleImageChange}
                label="Image de l'exercice (optionnelle)"
                previewSize="medium"
              />
            </div>

            <div className="items-list">
              {formState.items
                .sort((a, b) => a.position - b.position)
                .map((item, index) => (
                  <div key={item.id} className="ordering-item">
                    <span className="ordering-number">{item.position}.</span>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) =>
                        handleOrderItemChange(index, "text", e.target.value)
                      }
                      className="ordering-text"
                      placeholder="Texte de l'élément"
                    />
                    <input
                      type="number"
                      min="1"
                      max={formState.items.length}
                      value={item.position}
                      onChange={(e) =>
                        handleOrderItemChange(index, "position", e.target.value)
                      }
                      className="ordering-position"
                      title="Position dans l'ordre correct"
                    />

                    {/* Image pour l'élément */}
                    <ImageUploader
                      currentImageUrl={item.image}
                      onImageChange={(url) =>
                        handleOrderItemImageChange(index, url)
                      }
                      label="Image (optionnelle)"
                      previewSize="small"
                    />

                    <button
                      type="button"
                      onClick={() => removeOrderItem(index)}
                      className="btn btn-remove"
                      disabled={formState.items.length <= 2}
                    >
                      <Trash size={16} className="icon" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Explication commune à tous les types d'exercices */}
        <div className="form-group">
          <label className="form-label">
            Explication globale de l'exercice
          </label>
          <textarea
            name="explanation"
            className="form-textarea"
            rows="3"
            value={formState.explanation}
            onChange={handleChange}
          />
          <div className="latex-preview">
            <label className="form-label">Aperçu:</label>
            <div className="preview-box">
              <LatexRenderer text={formState.explanation} />
            </div>
          </div>
        </div>

        <div className="form-footer">
          <button
            type="button"
            className="btn btn-primary btn-save"
            onClick={updateExercise}
          >
            Enregistrer les modifications
          </button>
        </div>
      </div>
    </div>
  );
};

// Prévisualisation d'exercice
const ExercisePreview = ({ exercise }) => {
  const [userAnswers, setUserAnswers] = useState(() => {
    // Initialize user answers based on exercise type
    switch (exercise.type) {
      case "qcm":
        return exercise.questions.map(() => []);
      case "multiple_choice":
        return "";
      case "multiple_answers":
        return [];
      case "fill_in_blanks":
        return exercise.blanks.map(() => "");
      case "fill_in_blanks_options":
        return exercise.blanks.map(() => "");
      case "matching":
        return exercise.pairs.reduce((acc, pair) => {
          acc[pair.id] = "";
          return acc;
        }, {});
      case "ordering":
        return [...exercise.items]
          .sort(() => Math.random() - 0.5)
          .map((item) => item.id);
      default:
        return null;
    }
  });

  const [showAnswers, setShowAnswers] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // État pour afficher l'image en grand en cliquant dessus
  const [imageModal, setImageModal] = useState({
    show: false,
    imageUrl: "",
  });

  const handleMultipleChoiceChange = (option) => {
    setUserAnswers(option);
  };

  const handleMultipleAnswersChange = (option) => {
    if (userAnswers.includes(option)) {
      setUserAnswers(userAnswers.filter((ans) => ans !== option));
    } else {
      setUserAnswers([...userAnswers, option]);
    }
  };

  const handleFillBlankChange = (index, value) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    setUserAnswers(newAnswers);
  };

  const handleMatchingChange = (pairId, value) => {
    setUserAnswers({
      ...userAnswers,
      [pairId]: value,
    });
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId === targetId) return;

    const draggedIndex = userAnswers.findIndex((id) => id === draggedId);
    const targetIndex = userAnswers.findIndex((id) => id === targetId);

    const newOrder = [...userAnswers];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);

    setUserAnswers(newOrder);
  };

  // Afficher l'image en grand quand on clique dessus
  const showImageModal = (imageUrl) => {
    if (imageUrl) {
      setImageModal({
        show: true,
        imageUrl: imageUrl,
      });
    }
  };

  const closeImageModal = () => {
    setImageModal({
      show: false,
      imageUrl: "",
    });
  };

  // Gestion du QCM à questions multiples
  const handleQcmAnswerChange = (questionIndex, option) => {
    if (!showAnswers) {
      const newAnswers = [...userAnswers];

      // Si l'option est déjà sélectionnée, la désélectionner
      if (newAnswers[questionIndex].includes(option)) {
        newAnswers[questionIndex] = newAnswers[questionIndex].filter(
          (ans) => ans !== option
        );
      } else {
        newAnswers[questionIndex] = [...newAnswers[questionIndex], option];
      }

      setUserAnswers(newAnswers);
    }
  };

  // Gestion du texte à trous avec options
  const handleBlankWithOptionsChange = (index, value) => {
    if (!showAnswers) {
      const newAnswers = [...userAnswers];
      newAnswers[index] = value;
      setUserAnswers(newAnswers);
    }
  };

  const checkAnswers = () => {
    let isCorrect = false;
    let message = "";

    switch (exercise.type) {
      case "qcm": {
        // Vérifier chaque question
        const questionResults = exercise.questions.map((question, index) => {
          const userAns = userAnswers[index];

          // Une question est correcte si toutes les bonnes réponses sont sélectionnées
          // et aucune mauvaise réponse n'est sélectionnée
          const allCorrectSelected = question.correctAnswers.every((ans) =>
            userAns.includes(ans)
          );
          const noIncorrectSelected = userAns.every((ans) =>
            question.correctAnswers.includes(ans)
          );

          return allCorrectSelected && noIncorrectSelected;
        });

        // L'exercice est correct si toutes les questions sont correctes
        isCorrect = questionResults.every((result) => result);

        const correctCount = questionResults.filter(Boolean).length;
        message = isCorrect
          ? "Toutes les questions sont correctes !"
          : `${correctCount} question(s) correcte(s) sur ${exercise.questions.length}.`;
        break;
      }

      case "fill_in_blanks_options": {
        // Vérifier chaque trou
        const blankResults = exercise.blanks.map((blank, index) => {
          return userAnswers[index] === blank.correctAnswer;
        });

        isCorrect = blankResults.every((result) => result);
        message = isCorrect
          ? "Tous les trous sont correctement remplis !"
          : "Un ou plusieurs trous sont incorrectement remplis.";
        break;
      }

      case "multiple_choice":
        isCorrect = userAnswers === exercise.correctAnswer;
        message = isCorrect
          ? "Bonne réponse !"
          : "Réponse incorrecte. Réessayez.";
        break;

      case "multiple_answers":
        // Check if user selected all correct answers and no incorrect ones
        const allCorrectSelected = exercise.correctAnswers.every((ans) =>
          userAnswers.includes(ans)
        );
        const noIncorrectSelected = userAnswers.every((ans) =>
          exercise.correctAnswers.includes(ans)
        );
        isCorrect = allCorrectSelected && noIncorrectSelected;
        message = isCorrect
          ? "Toutes les bonnes réponses ont été sélectionnées !"
          : "Certaines réponses sont incorrectes ou il manque des réponses correctes.";
        break;

      case "fill_in_blanks":
        // Check each blank
        const blankResults = exercise.blanks.map((blank, index) => {
          const userAnswer = userAnswers[index].trim().toLowerCase();
          const isBlankCorrect =
            userAnswer === blank.correctAnswer.toLowerCase() ||
            blank.acceptableAnswers.some(
              (ans) => userAnswer === ans.toLowerCase()
            );
          return isBlankCorrect;
        });

        isCorrect = blankResults.every((result) => result);
        message = isCorrect
          ? "Tous les trous sont correctement remplis !"
          : "Un ou plusieurs trous sont incorrectement remplis.";
        break;

      case "matching":
        // Check each pair
        const pairResults = exercise.pairs.map((pair) => {
          return userAnswers[pair.id] === pair.right;
        });

        isCorrect = pairResults.every((result) => result);
        message = isCorrect
          ? "Toutes les associations sont correctes !"
          : "Une ou plusieurs associations sont incorrectes.";
        break;

      case "ordering":
        // Compare user order with correct order
        const correctOrder = [...exercise.items]
          .sort((a, b) => a.position - b.position)
          .map((item) => item.id);

        isCorrect =
          JSON.stringify(userAnswers) === JSON.stringify(correctOrder);
        message = isCorrect
          ? "L'ordre est correct !"
          : "L'ordre n'est pas correct.";
        break;
    }

    setFeedback({
      isCorrect,
      message,
    });

    setShowAnswers(true);
  };

  const resetExercise = () => {
    // Reset user answers based on exercise type
    switch (exercise.type) {
      case "qcm":
        setUserAnswers(exercise.questions.map(() => []));
        break;
      case "multiple_choice":
        setUserAnswers("");
        break;
      case "multiple_answers":
        setUserAnswers([]);
        break;
      case "fill_in_blanks":
        setUserAnswers(exercise.blanks.map(() => ""));
        break;
      case "fill_in_blanks_options":
        setUserAnswers(exercise.blanks.map(() => ""));
        break;
      case "matching":
        setUserAnswers(
          exercise.pairs.reduce((acc, pair) => {
            acc[pair.id] = "";
            return acc;
          }, {})
        );
        break;
      case "ordering":
        setUserAnswers(
          [...exercise.items]
            .sort(() => Math.random() - 0.5)
            .map((item) => item.id)
        );
        break;
    }

    setShowAnswers(false);
    setFeedback(null);
  };

  return (
    <div className="preview-container">
      <div className="preview-exercise">
        <h2 className="preview-title">
          <LatexRenderer text={exercise.text} />
        </h2>

        {/* Image de l'exercice si présente */}
        {exercise.image && (
          <div className="image-wrapper">
            <img
              src={exercise.image}
              alt="Illustration de l'exercice"
              className="exercise-image"
              onClick={() => showImageModal(exercise.image)}
            />
          </div>
        )}

        {/* QCM à questions multiples */}
        {exercise.type === "qcm" && (
          <div className="qcm-questions">
            {exercise.questions.map((question, qIndex) => (
              <div key={question.id} className="qcm-question">
                <h3 className="question-text">
                  <span className="question-number">{qIndex + 1}.</span>{" "}
                  <LatexRenderer text={question.text} />
                </h3>

                {/* Image de la question si présente */}
                {question.image && (
                  <div className="question-image">
                    <img
                      src={question.image}
                      alt={`Illustration question ${qIndex + 1}`}
                      className="exercise-image"
                      onClick={() => showImageModal(question.image)}
                    />
                  </div>
                )}

                <div className="multiple-answers">
                  {question.options.map((option, optIndex) => {
                    // Vérifier si cette option a une image
                    const hasImage =
                      question.optionImages &&
                      question.optionImages[optIndex] &&
                      question.optionImages[optIndex] !== null;

                    return (
                      <div
                        key={optIndex}
                        className={`answer-option ${
                          showAnswers &&
                          question.correctAnswers.includes(option)
                            ? "correct"
                            : ""
                        } ${
                          showAnswers &&
                          userAnswers[qIndex].includes(option) &&
                          !question.correctAnswers.includes(option)
                            ? "incorrect"
                            : ""
                        } ${
                          !showAnswers && userAnswers[qIndex].includes(option)
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => handleQcmAnswerChange(qIndex, option)}
                      >
                        <input
                          type="checkbox"
                          checked={userAnswers[qIndex].includes(option)}
                          onChange={() => handleQcmAnswerChange(qIndex, option)}
                          disabled={showAnswers}
                          className="answer-checkbox"
                        />

                        {/* Image de l'option si présente */}
                        {hasImage && (
                          <img
                            src={question.optionImages[optIndex]}
                            alt={`Option ${optIndex + 1}`}
                            className="option-image"
                            onClick={(e) => {
                              e.stopPropagation();
                              showImageModal(question.optionImages[optIndex]);
                            }}
                          />
                        )}

                        <span className="answer-text">
                          <LatexRenderer text={option} />
                        </span>

                        {showAnswers &&
                          question.correctAnswers.includes(option) && (
                            <Check size={18} className="answer-check" />
                          )}
                      </div>
                    );
                  })}
                </div>
                {showAnswers && (
                  <div className="question-explanation">
                    <h4>Explication :</h4>
                    <p>
                      <LatexRenderer text={question.explanation} />
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Texte à trous avec options */}
        {exercise.type === "fill_in_blanks_options" && (
          <div className="fill-blanks">
            {exercise.text.split("___").map((part, index, array) => (
              <React.Fragment key={index}>
                <LatexRenderer text={part} />
                {index < array.length - 1 && (
                  <span className="blank-wrapper">
                    {/* Dropdown personnalisé ou standard selon la présence de LaTeX */}
                    <CustomDropdown
                      options={(() => {
                        const blank = exercise.blanks.find(
                          (b) => b.position === index
                        );
                        return blank ? blank.options : [];
                      })()}
                      value={userAnswers[index] || ""}
                      onChange={(value) =>
                        handleBlankWithOptionsChange(index, value)
                      }
                      disabled={showAnswers}
                      className={`${
                        showAnswers
                          ? (() => {
                              const blank = exercise.blanks.find(
                                (b) => b.position === index
                              );
                              if (!blank) return "";
                              return userAnswers[index] === blank.correctAnswer
                                ? "correct"
                                : "incorrect";
                            })()
                          : ""
                      }`}
                      placeholder="Choisir..."
                    />

                    {showAnswers && (
                      <div className="blank-feedback">
                        {(() => {
                          const blank = exercise.blanks.find(
                            (b) => b.position === index
                          );
                          if (!blank) return null;

                          const isCorrect =
                            userAnswers[index] === blank.correctAnswer;

                          return isCorrect ? (
                            <span className="feedback-correct">Correct</span>
                          ) : (
                            <span className="feedback-incorrect">
                              Attendu :{" "}
                              <LatexRenderer text={blank.correctAnswer} />
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* QCM à réponse unique (ancien type) */}
        {exercise.type === "multiple_choice" && (
          <div className="multiple-choice">
            {exercise.options.map((option, index) => (
              <div
                key={index}
                className={`choice-option ${
                  showAnswers && option === exercise.correctAnswer
                    ? "correct"
                    : ""
                } ${
                  showAnswers &&
                  userAnswers === option &&
                  option !== exercise.correctAnswer
                    ? "incorrect"
                    : ""
                } ${!showAnswers && userAnswers === option ? "selected" : ""}`}
                onClick={() =>
                  !showAnswers && handleMultipleChoiceChange(option)
                }
              >
                <input
                  type="radio"
                  checked={userAnswers === option}
                  onChange={() =>
                    !showAnswers && handleMultipleChoiceChange(option)
                  }
                  disabled={showAnswers}
                  className="choice-radio"
                />
                <span className="choice-text">
                  <LatexRenderer text={option} />
                </span>
                {showAnswers && option === exercise.correctAnswer && (
                  <Check size={18} className="choice-check" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* QCM à réponses multiples (ancien type) */}
        {exercise.type === "multiple_answers" && (
          <div className="multiple-answers">
            {exercise.options.map((option, index) => (
              <div
                key={index}
                className={`answer-option ${
                  showAnswers && exercise.correctAnswers.includes(option)
                    ? "correct"
                    : ""
                } ${
                  showAnswers &&
                  userAnswers.includes(option) &&
                  !exercise.correctAnswers.includes(option)
                    ? "incorrect"
                    : ""
                } ${
                  !showAnswers && userAnswers.includes(option) ? "selected" : ""
                }`}
                onClick={() =>
                  !showAnswers && handleMultipleAnswersChange(option)
                }
              >
                <input
                  type="checkbox"
                  checked={userAnswers.includes(option)}
                  onChange={() =>
                    !showAnswers && handleMultipleAnswersChange(option)
                  }
                  disabled={showAnswers}
                  className="answer-checkbox"
                />
                <span className="answer-text">
                  <LatexRenderer text={option} />
                </span>
                {showAnswers && exercise.correctAnswers.includes(option) && (
                  <Check size={18} className="answer-check" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Texte à trous */}
        {exercise.type === "fill_in_blanks" && (
          <div className="fill-blanks">
            {exercise.text.split("___").map((part, index, array) => (
              <React.Fragment key={index}>
                <LatexRenderer text={part} />
                {index < array.length - 1 && (
                  <span className="blank-wrapper">
                    <input
                      type="text"
                      value={userAnswers[index] || ""}
                      onChange={(e) =>
                        !showAnswers &&
                        handleFillBlankChange(index, e.target.value)
                      }
                      disabled={showAnswers}
                      className={`blank-input ${
                        showAnswers
                          ? (() => {
                              const blank = exercise.blanks.find(
                                (b) => b.position === index
                              );
                              if (!blank) return "";
                              const userAns = userAnswers[index]
                                .trim()
                                .toLowerCase();
                              const isCorrect =
                                userAns === blank.correctAnswer.toLowerCase() ||
                                blank.acceptableAnswers.some(
                                  (ans) => userAns === ans.toLowerCase()
                                );
                              return isCorrect ? "correct" : "incorrect";
                            })()
                          : ""
                      }`}
                    />
                    {showAnswers && (
                      <div className="blank-feedback">
                        {(() => {
                          const blank = exercise.blanks.find(
                            (b) => b.position === index
                          );
                          if (!blank) return null;

                          const userAns = userAnswers[index]
                            .trim()
                            .toLowerCase();
                          const isCorrect =
                            userAns === blank.correctAnswer.toLowerCase() ||
                            blank.acceptableAnswers.some(
                              (ans) => userAns === ans.toLowerCase()
                            );

                          return isCorrect ? (
                            <span className="feedback-correct">Correct</span>
                          ) : (
                            <span className="feedback-incorrect">
                              Attendu : {blank.correctAnswer}
                              {blank.acceptableAnswers.length > 0 &&
                                ` (ou ${blank.acceptableAnswers.join(", ")})`}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Association */}
        {exercise.type === "matching" && (
          <div className="matching">
            {exercise.pairs.map((pair) => (
              <div key={pair.id} className="matching-pair">
                <div className="matching-left">
                  {/* Image à gauche si présente */}
                  {pair.leftImage && (
                    <img
                      src={pair.leftImage}
                      alt="Élément gauche"
                      className="pair-image"
                      onClick={() => showImageModal(pair.leftImage)}
                    />
                  )}
                  <LatexRenderer text={pair.left} />
                </div>

                <div className="matching-arrow">→</div>

                <select
                  value={userAnswers[pair.id] || ""}
                  onChange={(e) =>
                    !showAnswers &&
                    handleMatchingChange(pair.id, e.target.value)
                  }
                  disabled={showAnswers}
                  className={`matching-select ${
                    showAnswers
                      ? userAnswers[pair.id] === pair.right
                        ? "correct"
                        : "incorrect"
                      : ""
                  }`}
                >
                  <option value="">Sélectionnez...</option>
                  {exercise.pairs.map((p) => (
                    <option key={p.id} value={p.right}>
                      {p.right}
                    </option>
                  ))}
                </select>

                {/* Afficher l'image à droite si présente et si c'est la réponse correcte */}
                {showAnswers &&
                  pair.rightImage &&
                  userAnswers[pair.id] === pair.right && (
                    <img
                      src={pair.rightImage}
                      alt="Élément droit"
                      className="pair-image"
                      onClick={() => showImageModal(pair.rightImage)}
                    />
                  )}

                {showAnswers && (
                  <>
                    {userAnswers[pair.id] === pair.right ? (
                      <Check size={18} className="matching-check" />
                    ) : (
                      <div className="matching-correction">
                        Correct : <LatexRenderer text={pair.right} />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Mise en ordre */}
        {exercise.type === "ordering" && (
          <div className="ordering">
            {userAnswers.map((itemId, index) => {
              const item = exercise.items.find((i) => i.id === itemId);
              return (
                <div
                  key={itemId}
                  draggable={!showAnswers}
                  onDragStart={(e) => handleDragStart(e, itemId)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, itemId)}
                  className={`ordering-item ${
                    showAnswers
                      ? (() => {
                          const correctPosition = item.position - 1;
                          return correctPosition === index
                            ? "correct"
                            : "incorrect";
                        })()
                      : ""
                  }`}
                >
                  <span className="ordering-number">{index + 1}.</span>

                  {/* Image si présente */}
                  {item.image && (
                    <img
                      src={item.image}
                      alt={`Élément ${index + 1}`}
                      className="option-image"
                      onClick={() => showImageModal(item.image)}
                    />
                  )}

                  <span className="ordering-text">
                    <LatexRenderer text={item.text} />
                  </span>

                  {showAnswers && (
                    <div className="ordering-feedback">
                      {(() => {
                        const correctPosition = item.position - 1;
                        if (correctPosition === index) {
                          return (
                            <span className="feedback-correct">
                              Position correcte
                            </span>
                          );
                        } else {
                          return (
                            <span className="feedback-incorrect">
                              Position attendue : {item.position}
                            </span>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback et explication */}
      {feedback && (
        <div
          className={`feedback ${feedback.isCorrect ? "correct" : "incorrect"}`}
        >
          <p className="feedback-message">{feedback.message}</p>
          {showAnswers && (
            <div className="explanation">
              <h3 className="explanation-title">Explication :</h3>
              <p className="explanation-text">
                <LatexRenderer text={exercise.explanation} />
              </p>
            </div>
          )}
        </div>
      )}

      {/* Boutons d'action */}
      <div className="preview-actions">
        <button className="btn btn-secondary" onClick={resetExercise}>
          Réinitialiser
        </button>
        <button
          className="btn btn-primary"
          onClick={checkAnswers}
          disabled={showAnswers}
        >
          Vérifier les réponses
        </button>
      </div>

      {/* Modal pour les images */}
      {imageModal.show && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="modal-close" onClick={closeImageModal}>
              ×
            </span>
            <img
              src={imageModal.imageUrl}
              alt="Image agrandie"
              className="modal-image"
              onError={(e) => {
                e.target.src =
                  "https://via.placeholder.com/800x600?text=Image+non+disponible";
                e.target.onerror = null;
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
