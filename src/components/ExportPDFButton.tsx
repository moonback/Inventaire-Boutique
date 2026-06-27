import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { InventoryItem, CategoryItem } from "../types";
import { FileText, Loader2 } from "lucide-react";

interface ExportPDFButtonProps {
  items: InventoryItem[];
  categories?: CategoryItem[];
  className?: string;
}

export function ExportPDFButton({
  items,
  categories = [],
  className = "",
}: ExportPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const getCategoryName = (categoryId?: string): string => {
    if (!categoryId) return "Sans catégorie";
    const category = categories.find((cat) => cat.id === categoryId || cat.name === categoryId);
    return category?.name || categoryId;
  };

  const groupItemsByCategory = (items: InventoryItem[]): Map<string, InventoryItem[]> => {
    const grouped = new Map<string, InventoryItem[]>();
    
    items.forEach((item) => {
      const categoryKey = item.category || "sans-categorie";
      if (!grouped.has(categoryKey)) {
        grouped.set(categoryKey, []);
      }
      grouped.get(categoryKey)!.push(item);
    });
    
    // Trier les catégories par nom
    return new Map([...grouped.entries()].sort((a, b) => {
      const nameA = getCategoryName(a[0]);
      const nameB = getCategoryName(b[0]);
      return nameA.localeCompare(nameB);
    }));
  };

  const loadImage = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (!url) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const addImageToPDF = async (
    doc: jsPDF,
    imageUrl: string | undefined,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> => {
    if (!imageUrl) return;
    
    try {
      const img = await loadImage(imageUrl);
      if (!img) return;
      
      // Convertir l'image en base64
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      doc.addImage(dataUrl, "JPEG", x, y, width, height);
    } catch (error) {
      console.error("Erreur lors du chargement de l'image:", error);
    }
  };

  const generatePDF = async () => {
    if (items.length === 0) return;
    
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      
      let yPos = 15;
      
      // En-tête
      doc.setFontSize(24);
      doc.setTextColor(16, 185, 129);
      doc.text("Inventaire", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;
      
      // Date
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      const dateStr = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      doc.text(dateStr, pageWidth / 2, yPos, { align: "center" });
      yPos += 12;
      
      // Ligne de séparation
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      
      // Grouper les articles par catégorie
      const groupedItems = groupItemsByCategory(items);
      
      for (const [categoryId, categoryItems] of groupedItems) {
        // Vérifier si nouvelle page nécessaire
        if (yPos > pageHeight - 50) {
          doc.addPage("landscape");
          yPos = 15;
        }
        
        // Nom de la catégorie avec fond
        const categoryName = getCategoryName(categoryId);
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 12, 2, 2, "F");
        
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text(categoryName, margin + 4, yPos + 2);
        yPos += 18;
        
        // En-têtes du tableau
        const colWidths = [35, 60, 25, 25, 25, 35, 35];
        const colX = [
          margin,
          margin + colWidths[0],
          margin + colWidths[0] + colWidths[1],
          margin + colWidths[0] + colWidths[1] + colWidths[2],
          margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
          margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4],
          margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5],
        ];
        
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
        
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.setFont("helvetica", "bold");
        doc.text("Photo", colX[0] + 2, yPos);
        doc.text("Article", colX[1] + 2, yPos);
        doc.text("Marque", colX[2] + 2, yPos);
        doc.text("Qté", colX[3] + 2, yPos);
        doc.text("Catégorie", colX[4] + 2, yPos);
        doc.text("Prix Achat", colX[5] + 2, yPos);
        doc.text("Prix Vente", colX[6] + 2, yPos);
        yPos += 8;
        
        // Articles de la catégorie
        for (let i = 0; i < categoryItems.length; i++) {
          const item = categoryItems[i];
          
          // Vérifier si nouvelle page nécessaire
          if (yPos > pageHeight - 30) {
            doc.addPage("landscape");
            yPos = 15;
          }
          
          // Ligne alternée
          if (i % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPos - 3, pageWidth - 2 * margin, 12, "F");
          }
          
          // Photo
          if (item.imageUrl) {
            await addImageToPDF(doc, item.imageUrl, colX[0] + 2, yPos - 2, 25, 10);
          }
          
          // Texte
          doc.setFontSize(8);
          doc.setTextColor(55, 65, 81);
          doc.setFont("helvetica", "normal");
          
          // Nom (tronqué si trop long)
          let nameText = item.name;
          if (nameText.length > 30) {
            nameText = nameText.substring(0, 27) + "...";
          }
          doc.text(nameText, colX[1] + 2, yPos + 3);
          
          // Marque
          const brandText = item.brand || "-";
          doc.text(brandText, colX[2] + 2, yPos + 3);
          
          // Quantité en gras
          doc.setFont("helvetica", "bold");
          doc.setTextColor(16, 185, 129);
          doc.text(item.quantity.toString(), colX[3] + 8, yPos + 3, { align: "center" });
          
          // Catégorie
          doc.setFont("helvetica", "normal");
          doc.setTextColor(55, 65, 81);
          const catText = item.category ? getCategoryName(item.category) : "-";
          doc.text(catText, colX[4] + 2, yPos + 3);
          
          // Prix d'achat
          if (item.purchasePrice) {
            doc.text(item.purchasePrice.toFixed(2) + " €", colX[5] + 2, yPos + 3);
          } else {
            doc.text("-", colX[5] + 2, yPos + 3);
          }
          
          // Prix de vente en couleur
          if (item.salesPrice) {
            doc.setTextColor(99, 102, 241);
            doc.setFont("helvetica", "bold");
            doc.text(item.salesPrice.toFixed(2) + " €", colX[6] + 2, yPos + 3);
          } else {
            doc.setFont("helvetica", "normal");
            doc.text("-", colX[6] + 2, yPos + 3);
          }
          
          yPos += 12;
        }
        
        yPos += 10; // Espacement entre catégories
      }
      
      // Pied de page avec totaux
      const totalItems = items.length;
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalPurchase = items.reduce((sum, item) => sum + (item.purchasePrice || 0) * item.quantity, 0);
      const totalSales = items.reduce((sum, item) => sum + (item.salesPrice || 0) * item.quantity, 0);
      
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, pageHeight - 25, pageWidth - 2 * margin, 18, "F");
      
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.setFont("helvetica", "bold");
      doc.text(`Total: ${totalItems} article${totalItems > 1 ? 's' : ''} • ${totalQuantity} unités`, margin + 5, pageHeight - 18);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(`Achat: ${totalPurchase.toFixed(2)} € | Vente: ${totalSales.toFixed(2)} € | Marge: ${(totalSales - totalPurchase).toFixed(2)} €`, margin + 5, pageHeight - 11);
      
      // Sauvegarder le PDF
      const fileName = `inventaire_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert("Une erreur est survenue lors de la génération du PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating || items.length === 0}
      className={`
        group flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold
        transition-all duration-200
        ${
          isGenerating || items.length === 0
            ? "cursor-not-allowed border border-white/15 bg-white/10 text-white/45"
            : "border border-white/30 bg-white text-emerald-700 shadow-lg shadow-emerald-950/15 active:scale-[0.98] hover:bg-emerald-50"
        }
        ${className}
      `}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Génération...</span>
        </>
      ) : (
        <>
          <span
            className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg ${
              items.length === 0 ? "bg-white/10" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
          </span>
          <span className="flex min-w-0 items-center gap-2 leading-none">
            <span className="truncate">Exporter PDF</span>
            <span
              className={`hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-flex ${
                items.length === 0 ? "text-white/40" : "text-emerald-600/80"
              }`}
            >
              {items.length} article{items.length > 1 ? "s" : ""}
            </span>
          </span>
        </>
      )}
    </button>
  );
}
