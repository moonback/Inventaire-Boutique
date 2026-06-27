import React, { useState } from "react";
import { motion } from "motion/react";
import { X, FileText, Table, Check, Loader2 } from "lucide-react";
import { InventoryItem, CategoryItem } from "../types";
import { jsPDF } from "jspdf";

type ExportModalProps = {
  items: InventoryItem[];
  categories?: CategoryItem[];
  onClose: () => void;
};

export function ExportModal({
  items,
  categories = [],
  onClose,
}: ExportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportType, setExportType] = useState<"csv" | "pdf" | null>(null);

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
    setExportType("pdf");
    
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      
      let yPos = 15;
      
      doc.setFontSize(24);
      doc.setTextColor(16, 185, 129);
      doc.text("Inventaire", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;
      
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
      
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      
      const groupedItems = groupItemsByCategory(items);
      
      for (const [categoryId, categoryItems] of groupedItems) {
        if (yPos > pageHeight - 50) {
          doc.addPage("landscape");
          yPos = 15;
        }
        
        const categoryName = getCategoryName(categoryId);
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 12, 2, 2, "F");
        
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text(categoryName, margin + 4, yPos + 2);
        yPos += 18;
        
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
        
        for (let i = 0; i < categoryItems.length; i++) {
          const item = categoryItems[i];
          
          if (yPos > pageHeight - 30) {
            doc.addPage("landscape");
            yPos = 15;
          }
          
          if (i % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPos - 3, pageWidth - 2 * margin, 12, "F");
          }
          
          if (item.imageUrl) {
            await addImageToPDF(doc, item.imageUrl, colX[0] + 2, yPos - 2, 25, 10);
          }
          
          doc.setFontSize(8);
          doc.setTextColor(55, 65, 81);
          doc.setFont("helvetica", "normal");
          
          let nameText = item.name;
          if (nameText.length > 30) {
            nameText = nameText.substring(0, 27) + "...";
          }
          doc.text(nameText, colX[1] + 2, yPos + 3);
          
          const brandText = item.brand || "-";
          doc.text(brandText, colX[2] + 2, yPos + 3);
          
          doc.setFont("helvetica", "bold");
          doc.setTextColor(16, 185, 129);
          doc.text(item.quantity.toString(), colX[3] + 8, yPos + 3, { align: "center" });
          
          doc.setFont("helvetica", "normal");
          doc.setTextColor(55, 65, 81);
          const catText = item.category ? getCategoryName(item.category) : "-";
          doc.text(catText, colX[4] + 2, yPos + 3);
          
          if (item.purchasePrice) {
            doc.text(item.purchasePrice.toFixed(2) + " €", colX[5] + 2, yPos + 3);
          } else {
            doc.text("-", colX[5] + 2, yPos + 3);
          }
          
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
        
        yPos += 10;
      }
      
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
      
      const fileName = `inventaire_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      onClose();
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert("Une erreur est survenue lors de la génération du PDF.");
    } finally {
      setIsGenerating(false);
      setExportType(null);
    }
  };

  const generateCSV = () => {
    if (items.length === 0) return;
    
    setIsGenerating(true);
    setExportType("csv");
    
    try {
      const csvContent =
        "data:text/csv;charset=utf-8," +
        "Code-barres,Nom,Marque,Catégorie,Quantité,Prix d'achat,Prix de vente\n" +
        items
          .map(
            (i) =>
              `${i.barcode},"${i.name.replace(/"/g, '""')}","${i.brand || ""}","${i.category || ""}",${i.quantity},${i.purchasePrice ?? ""},${i.salesPrice ?? ""}`,
          )
          .join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `inventaire_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onClose();
    } catch (error) {
      console.error("Erreur lors de la génération du CSV:", error);
      alert("Une erreur est survenue lors de la génération du CSV.");
    } finally {
      setIsGenerating(false);
      setExportType(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="w-full sm:max-w-md bg-white border-t sm:border border-stone-200 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl shadow-stone-900/25 overflow-hidden pb-safe max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex justify-center py-3 sm:hidden sticky top-0 bg-white z-10">
          <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
        </div>

        <div className="p-6">
          <div className="absolute top-4 right-4 hidden sm:block">
            <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Exporter l'inventaire</h3>
              <p className="text-xs text-stone-500 font-medium mt-0.5">Choisissez le format d'export</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={generateCSV}
              disabled={isGenerating}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center">
                {isGenerating && exportType === "csv" ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Table className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-stone-900">CSV</p>
                <p className="text-xs text-stone-500">Format compatible avec Excel et tableurs</p>
              </div>
              {!isGenerating && <Check className="w-5 h-5 text-stone-300" />}
            </button>

            <button
              onClick={generatePDF}
              disabled={isGenerating}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center">
                {isGenerating && exportType === "pdf" ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <FileText className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-stone-900">PDF</p>
                <p className="text-xs text-stone-500">Format imprimable avec photos et totaux</p>
              </div>
              {!isGenerating && <Check className="w-5 h-5 text-stone-300" />}
            </button>
          </div>

          <button onClick={onClose} disabled={isGenerating} className="w-full py-4 text-sm font-semibold text-stone-500 bg-transparent border border-stone-200 hover:bg-stone-50 hover:text-stone-800 active:scale-95 rounded-2xl transition disabled:opacity-50 disabled:cursor-not-allowed">
            Annuler
          </button>
        </div>
      </motion.div>
    </div>
  );
}
