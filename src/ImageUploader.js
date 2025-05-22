import React, { useState } from "react";
import { Image, X, Upload } from "lucide-react";

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

export default ImageUploader;
