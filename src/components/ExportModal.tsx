import { useState } from "react";
import { motion } from "motion/react";
import { X, FileText, Table, Check, Loader2 } from "lucide-react";
import { InventoryItem, CategoryItem } from "../types";
import { jsPDF } from "jspdf";

type ExportModalProps = {
  items: InventoryItem[];
  categories?: CategoryItem[];
  onClose: () => void;
};

type ExportProgress = {
  current: number;
  total: number;
  label: string;
};

export function ExportModal({
  items,
  categories = [],
  onClose,
}: ExportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportType, setExportType] = useState<"csv" | "pdf" | null>(null);
  const [showPdfProgress, setShowPdfProgress] = useState(false);
  const [progress, setProgress] = useState<ExportProgress>({
    current: 0,
    total: items.length,
    label: "Pret a exporter",
  });

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

  const formatCurrency = (value?: number): string => {
    if (value === undefined || value === null) return "-";
    return `${value.toFixed(2)} EUR`;
  };

  const truncateText = (value: string | undefined, maxLength: number): string => {
    if (!value) return "-";
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 3)}...`;
  };

  const waitForPaint = () => new Promise((resolve) => window.setTimeout(resolve, 0));

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

    setShowPdfProgress(true);
    setIsGenerating(true);
    setExportType("pdf");
    setProgress({
      current: 0,
      total: items.length,
      label: "Preparation du document PDF...",
    });

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const footerHeight = 12;
      const tableRowHeight = 15;
      const categoryHeaderHeight = 10;
      const summaryCardHeight = 20;
      const tableHeaderHeight = 10;
      const contentBottom = pageHeight - margin - footerHeight;
      const generatedAt = new Date();
      const dateStr = generatedAt.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const totalReferences = items.length;
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalPurchase = items.reduce((sum, item) => sum + (item.purchasePrice ?? 0) * item.quantity, 0);
      const totalSales = items.reduce((sum, item) => sum + (item.salesPrice ?? 0) * item.quantity, 0);
      const totalMargin = totalSales - totalPurchase;
      const groupedItems = groupItemsByCategory(items);
      const categoryCount = groupedItems.size;

      const colWidths = [18, 58, 30, 16, 38, 23, 23, 23];
      const colX = colWidths.reduce<number[]>((positions, width, index) => {
        if (index === 0) {
          positions.push(margin);
        } else {
          positions.push(positions[index - 1] + colWidths[index - 1]);
        }
        return positions;
      }, []);

      const addPageHeader = (isFirstPage: boolean) => {
        doc.setFillColor(5, 150, 105);
        doc.rect(0, 0, pageWidth, 26, "F");
        doc.setFillColor(15, 118, 110);
        doc.rect(pageWidth - 72, 0, 72, 26, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(21);
        doc.setTextColor(255, 255, 255);
        doc.text("Inventaire Boutique", margin, 11);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Export professionnel du stock", margin, 17);

        doc.setFontSize(8.5);
        doc.text(dateStr, pageWidth - margin, 11, { align: "right" });
        doc.text(`${categoryCount} categorie${categoryCount > 1 ? "s" : ""}`, pageWidth - margin, 17, {
          align: "right",
        });

        doc.setDrawColor(209, 250, 229);
        doc.setLineWidth(0.5);
        doc.line(margin, 30, pageWidth - margin, 30);

        if (!isFirstPage) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(17, 24, 39);
          doc.text("Detail de l'inventaire", margin, 37);
        }
      };

      const drawSummaryCards = (startY: number) => {
        const gap = 4;
        const cardWidth = (pageWidth - (margin * 2) - (gap * 4)) / 5;
        const cards = [
          { label: "References", value: `${totalReferences}`, tone: [241, 245, 249], accent: [51, 65, 85] },
          { label: "Quantite totale", value: `${totalQuantity}`, tone: [236, 253, 245], accent: [5, 150, 105] },
          { label: "Valeur achat", value: formatCurrency(totalPurchase), tone: [239, 246, 255], accent: [37, 99, 235] },
          { label: "Valeur vente", value: formatCurrency(totalSales), tone: [243, 232, 255], accent: [147, 51, 234] },
          { label: "Marge brute", value: formatCurrency(totalMargin), tone: [255, 247, 237], accent: [234, 88, 12] },
        ];

        cards.forEach((card, index) => {
          const x = margin + index * (cardWidth + gap);
          doc.setFillColor(card.tone[0], card.tone[1], card.tone[2]);
          doc.roundedRect(x, startY, cardWidth, summaryCardHeight, 3, 3, "F");

          doc.setFillColor(card.accent[0], card.accent[1], card.accent[2]);
          doc.roundedRect(x, startY, 2.5, summaryCardHeight, 3, 3, "F");

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(card.label, x + 6, startY + 7);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text(card.value, x + 6, startY + 14);
        });
      };

      const drawTableHeader = (y: number) => {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, y, pageWidth - (margin * 2), tableHeaderHeight, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);

        const labels = ["Photo", "Article", "Marque", "Qte", "Categorie", "Achat", "Vente", "Marge"];
        labels.forEach((label, index) => {
          const isNumeric = index >= 5 || index === 3;
          const cellX = colX[index];
          const cellWidth = colWidths[index];
          doc.text(label, isNumeric ? cellX + cellWidth - 2 : cellX + 2, y + 6.5, {
            align: isNumeric ? "right" : "left",
          });
        });
      };

      const drawPageFooter = (pageNumber: number, pageCount: number) => {
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.4);
        doc.line(margin, pageHeight - footerHeight, pageWidth - margin, pageHeight - footerHeight);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`Genere le ${dateStr}`, margin, pageHeight - 4);
        doc.text(`Page ${pageNumber} / ${pageCount}`, pageWidth - margin, pageHeight - 4, {
          align: "right",
        });
      };

      let pageIndex = 1;
      let yPos = 34;
      let processedItems = 0;
      addPageHeader(true);
      drawSummaryCards(yPos);
      yPos += summaryCardHeight + 10;

      const ensureSpace = (requiredHeight: number, redrawTableHeader = false) => {
        if (yPos + requiredHeight <= contentBottom) return;
        doc.addPage("a4", "landscape");
        pageIndex += 1;
        addPageHeader(false);
        yPos = 42;
        if (redrawTableHeader) {
          drawTableHeader(yPos);
          yPos += tableHeaderHeight + 3;
        }
      };

      for (const [categoryId, categoryItems] of groupedItems) {
        const categoryName = getCategoryName(categoryId);
        const categoryQuantity = categoryItems.reduce((sum, item) => sum + item.quantity, 0);
        const categoryPurchase = categoryItems.reduce(
          (sum, item) => sum + (item.purchasePrice ?? 0) * item.quantity,
          0,
        );
        const categorySales = categoryItems.reduce(
          (sum, item) => sum + (item.salesPrice ?? 0) * item.quantity,
          0,
        );
        const categoryMargin = categorySales - categoryPurchase;

        ensureSpace(categoryHeaderHeight + tableHeaderHeight + tableRowHeight + 7);
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(margin, yPos, pageWidth - (margin * 2), categoryHeaderHeight, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(categoryName, margin + 3, yPos + 6.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(
          `${categoryItems.length} reference${categoryItems.length > 1 ? "s" : ""} | ${categoryQuantity} unite${categoryQuantity > 1 ? "s" : ""}`,
          pageWidth - margin - 3,
          yPos + 6.5,
          { align: "right" },
        );
        yPos += categoryHeaderHeight + 3;

        drawTableHeader(yPos);
        yPos += tableHeaderHeight + 3;

        for (let i = 0; i < categoryItems.length; i++) {
          const item = categoryItems[i];

          ensureSpace(tableRowHeight + 2, true);

          doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
          doc.roundedRect(margin, yPos, pageWidth - (margin * 2), tableRowHeight - 2, 2, 2, "F");

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(margin, yPos + tableRowHeight - 2, pageWidth - margin, yPos + tableRowHeight - 2);

          doc.setDrawColor(241, 245, 249);
          for (let columnIndex = 1; columnIndex < colX.length; columnIndex++) {
            doc.line(colX[columnIndex], yPos + 1, colX[columnIndex], yPos + tableRowHeight - 3);
          }

          const photoX = colX[0] + 2;
          const photoY = yPos + 1.5;
          const photoSize = 11;
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(photoX, photoY, photoSize, photoSize, 1.5, 1.5, "F");
          if (item.imageUrl) {
            await addImageToPDF(doc, item.imageUrl, photoX, photoY, photoSize, photoSize);
          } else {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184);
            doc.text("IMG", photoX + (photoSize / 2), photoY + 6.7, { align: "center" });
          }

          const marginValue = (item.salesPrice ?? 0) - (item.purchasePrice ?? 0);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(17, 24, 39);
          doc.text(truncateText(item.name, 28), colX[1] + 2, yPos + 6);

          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(item.barcode, colX[1] + 2, yPos + 11);

          doc.setFontSize(8);
          doc.setTextColor(55, 65, 81);
          doc.text(truncateText(item.brand, 16), colX[2] + 2, yPos + 8);

          doc.setFont("helvetica", "bold");
          doc.setTextColor(item.quantity <= 5 ? 217 : 5, item.quantity <= 5 ? 119 : 150, item.quantity <= 5 ? 6 : 105);
          doc.text(String(item.quantity), colX[3] + (colWidths[3] / 2), yPos + 8, { align: "center" });

          doc.setFont("helvetica", "normal");
          doc.setTextColor(55, 65, 81);
          doc.text(truncateText(getCategoryName(item.category), 22), colX[4] + 2, yPos + 8);

          doc.text(formatCurrency(item.purchasePrice), colX[5] + colWidths[5] - 2, yPos + 8, { align: "right" });

          doc.setTextColor(79, 70, 229);
          doc.setFont("helvetica", "bold");
          doc.text(formatCurrency(item.salesPrice), colX[6] + colWidths[6] - 2, yPos + 8, { align: "right" });

          doc.setTextColor(marginValue >= 0 ? 5 : 220, marginValue >= 0 ? 150 : 38, marginValue >= 0 ? 105 : 38);
          doc.text(formatCurrency(marginValue), colX[7] + colWidths[7] - 2, yPos + 8, { align: "right" });

          processedItems += 1;
          setProgress({
            current: processedItems,
            total: items.length,
            label: `Export PDF en cours - ${categoryName}`,
          });
          if (processedItems % 5 === 0 || processedItems === items.length) {
            await waitForPaint();
          }

          yPos += tableRowHeight;
        }

        ensureSpace(12);
        doc.setFillColor(240, 253, 250);
        doc.roundedRect(margin + 6, yPos, pageWidth - (margin * 2) - 6, 9, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text("Sous-total categorie", margin + 10, yPos + 5.8);
        doc.text(`${categoryQuantity} unites`, margin + 72, yPos + 5.8);
        doc.text(formatCurrency(categoryPurchase), pageWidth - margin - 60, yPos + 5.8, { align: "right" });
        doc.text(formatCurrency(categorySales), pageWidth - margin - 34, yPos + 5.8, { align: "right" });
        doc.text(formatCurrency(categoryMargin), pageWidth - margin - 4, yPos + 5.8, { align: "right" });
        yPos += 14;
      }

      ensureSpace(18);
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 14, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(
        `Bilan global: ${totalReferences} references | ${totalQuantity} unites | Achat ${formatCurrency(totalPurchase)} | Vente ${formatCurrency(totalSales)} | Marge ${formatCurrency(totalMargin)}`,
        margin + 4,
        yPos + 8.5,
      );

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        drawPageFooter(page, pageCount);
      }

      setProgress({
        current: items.length,
        total: items.length,
        label: "PDF finalise",
      });

      const fileName = `inventaire_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      onClose();
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert("Une erreur est survenue lors de la génération du PDF.");
    } finally {
      setIsGenerating(false);
      setExportType(null);
      setProgress({
        current: 0,
        total: items.length,
        label: "Pret a exporter",
      });
    }
  };

  const generateCSV = () => {
    if (items.length === 0) return;

    setIsGenerating(true);
    setExportType("csv");
    setProgress({
      current: 0,
      total: items.length,
      label: "Preparation du fichier CSV...",
    });

    try {
      setProgress({
        current: items.length,
        total: items.length,
        label: "CSV finalise",
      });

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
      setShowPdfProgress(false);
      setProgress({
        current: 0,
        total: items.length,
        label: "Pret a exporter",
      });
    }
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

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
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                {items.length} produit{items.length > 1 ? "s" : ""} a exporter
              </p>
            </div>
          </div>

          {showPdfProgress && (
            <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Progression PDF</p>
                  <p className="mt-1 text-sm font-bold text-stone-900">{progress.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold tabular-nums text-emerald-700">
                    {progress.current}/{progress.total}
                  </p>
                  <p className="text-[11px] font-medium text-stone-500">produits</p>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-stone-500">
                <span>{isGenerating ? "Export PDF en cours..." : "En attente"}</span>
                <span>{progressPercent}%</span>
              </div>
            </div>
          )}

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
                <p className="text-xs text-stone-500">
                  Format compatible avec Excel et tableurs - {items.length} ligne{items.length > 1 ? "s" : ""}
                </p>
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
                <p className="text-xs text-stone-500">
                  Format imprimable avec photos et totaux - {items.length} produit{items.length > 1 ? "s" : ""}
                </p>
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
