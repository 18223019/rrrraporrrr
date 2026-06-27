/**
 * MultiPagePDFButton - Download 5 Pages (Dashboard + 4 Bidang) in One PDF
 * Beautiful button design with 16:9 optimized layout
 */

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { announceToScreenReader } from '../../utils/accessibility';

interface MultiPagePDFButtonProps {
  userName: string;
  userSlug: string;
  userPanggilan: string;
  userFullName: string;
  selectedMonth: string;
  className?: string;
}

interface PageConfig {
  title: string;
  selector: string;
  route: string;
}

const PAGES: PageConfig[] = [
  { title: 'Dashboard', selector: '.dashboard-content', route: '' },
  { title: 'Ketakmiran', selector: '.bidang-content', route: '/ketakmiran' },
  { title: 'Pembinaan', selector: '.bidang-content', route: '/pembinaan' },
  { title: 'Aktualisasi Diri', selector: '.bidang-content', route: '/aktualisasi' },
  { title: 'Internal', selector: '.bidang-content', route: '/internal' },
];

export const MultiPagePDFButton: React.FC<MultiPagePDFButtonProps> = ({
  userName,
  userSlug,
  userPanggilan,
  userFullName,
  selectedMonth,
  className = '',
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const capturePageAsCanvas = async (
    pageElement: HTMLElement,
    pageTitle: string
  ): Promise<HTMLCanvasElement> => {
    try {
      // Wait 200ms for any final pending renders (minimal delay for SSR)
      await new Promise(resolve => setTimeout(resolve, 200));

      // Capture directly from DOM (NOT clone) to preserve Chart.js canvas
      const canvas = await html2canvas(pageElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Use CSS background from [data-pdf-export]
        logging: false,
        // Capture natural dimensions
        width: pageElement.offsetWidth,
        height: pageElement.offsetHeight,
        // Important: Don't ignore elements
        ignoreElements: (element) => {
          // Only ignore scroll bars
          return element.tagName === 'SCROLLBAR';
        },
        // Force canvas rendering
        onclone: (clonedDoc) => {
          // Find all chart canvases in the cloned document
          const clonedElement = clonedDoc.querySelector(`.${pageElement.className.split(' ')[0]}`) as HTMLElement;
          if (!clonedElement) return;

          // Copy canvas content from original to clone
          const originalCanvases = pageElement.querySelectorAll('canvas');
          const clonedCanvases = clonedElement.querySelectorAll('canvas');

          originalCanvases.forEach((originalCanvas, index) => {
            if (clonedCanvases[index]) {
              const clonedCanvas = clonedCanvases[index] as HTMLCanvasElement;
              const ctx = clonedCanvas.getContext('2d');
              if (ctx) {
                // Copy canvas dimensions
                clonedCanvas.width = originalCanvas.width;
                clonedCanvas.height = originalCanvas.height;
                // Draw original canvas onto cloned canvas
                ctx.drawImage(originalCanvas, 0, 0);
              }
            }
          });

          // Disable animations in clone
          clonedElement.querySelectorAll('*').forEach((el) => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.style) {
              htmlEl.style.animation = 'none';
              htmlEl.style.transition = 'none';
            }
          });
        },
      });

      return canvas;
    } catch (error) {
      console.error(`Error capturing ${pageTitle}:`, error);
      throw error;
    }
  };

  const navigateToPage = async (route: string): Promise<void> => {
    return new Promise((resolve) => {
      if (route) {
        window.history.pushState({}, '', `/${userSlug}${route}`);
        // Trigger React Router navigation
        const navEvent = new PopStateEvent('popstate');
        window.dispatchEvent(navEvent);
      }
      // Wait 300ms for page navigation (SSR pre-rendered pages load instantly!)
      // Minimal delay just for React Router update
      setTimeout(resolve, 300);
    });
  };

  const handleMultiPageDownload = async () => {
    setIsGenerating(true);
    setCurrentPage(0);

    // ⏱️ START PDF GENERATION TIMING
    const pdfStartTime = performance.now();
    console.log(`[PDF GENERATOR] Starting multi-page PDF generation`);

    const toastId = 'pdf-multi-gen';
    toast.loading('Menyiapkan PDF 5 halaman (perkiraan 10-15 detik)...', { id: toastId });
    announceToScreenReader('Generating 5-page PDF report, estimated 10 to 15 seconds', 'polite');

    try {
      // Store original location
      const originalPath = window.location.pathname;
      const canvases: Array<{ canvas: HTMLCanvasElement; title: string }> = [];

      // Step 1: Navigate and capture each page
      for (let i = 0; i < PAGES.length; i++) {
        const page = PAGES[i];
        setCurrentPage(i + 1);

        toast.loading(`Snapshot halaman ${page.title}... (${i + 1}/${PAGES.length}) - Tunggu sebentar...`, {
          id: toastId,
        });

        // ⏱️ Page timing
        const pageStartTime = performance.now();
        console.log(`[PDF] Page ${i + 1}/${PAGES.length}: ${page.title} - Starting...`);

        // Navigate to page
        await navigateToPage(page.route);
        console.log(`[PDF] Page ${i + 1}: Navigation complete (waited 0.3s)`);

        // Wait 500ms for charts to render (minimal for SSR pre-rendered pages)
        // Total wait time: 0.3s (navigation) + 0.5s (render) + 0.2s (capture) = 1 second per page
        // Super fast thanks to SSR pre-rendering!
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log(`[PDF] Page ${i + 1}: Render wait complete (waited 0.5s)`);

        // Find and capture content
        const pageElement = document.querySelector(page.selector) as HTMLElement;

        if (!pageElement) {
          console.warn(`[PDF] Page element not found for ${page.title}, skipping...`);
          continue;
        }

        console.log(`[PDF] Page ${i + 1}: Starting snapshot...`);

        // Add PDF capture mode class BEFORE capturing
        pageElement.classList.add('pdf-capture-mode');

        const canvas = await capturePageAsCanvas(pageElement, page.title);
        canvases.push({ canvas, title: page.title });

        // Remove PDF capture mode class AFTER capturing
        pageElement.classList.remove('pdf-capture-mode');

        const pageEndTime = performance.now();
        console.log(`[PDF] Page ${i + 1}: ${page.title} captured in ${((pageEndTime - pageStartTime) / 1000).toFixed(2)}s`);
      }

      console.log(`[PDF] All ${canvases.length} pages captured successfully`);

      // Navigate back to original page
      window.history.pushState({}, '', originalPath);
      const navEvent = new PopStateEvent('popstate');
      window.dispatchEvent(navEvent);

      toast.loading('Membuat PDF...', { id: toastId });

      // Step 2: Create PDF with all pages
      // Use landscape for better fit
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4', // 297 x 210 mm (landscape = 297 wide)
      });

      // A4 Landscape dimensions
      const pdfWidth = 297;
      const pdfHeight = 210;
      const margin = 8; // Reduced margin for larger content area
      const headerSpace = 10; // Space for header
      const footerSpace = 8; // Space for footer

      // Available space for content
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2) - headerSpace - footerSpace;

      // Add metadata
      pdf.setProperties({
        title: `Rapor Asrama - ${userName}`,
        subject: 'Laporan Kinerja Komprehensif',
        author: userName,
        keywords: 'rapor, asrama, dashboard, ketakmiran, pembinaan, aktualisasi, internal',
        creator: 'Rapor Asrama App',
      });


      // Step 3: Add each canvas as a page
      for (let i = 0; i < canvases.length; i++) {
        const { canvas, title } = canvases[i];

        if (i > 0) {
          pdf.addPage('a4', 'landscape');
        }

        // Calculate optimal fit without distortion
        const canvasRatio = canvas.width / canvas.height;
        const availableRatio = availableWidth / availableHeight;

        let imgWidth: number;
        let imgHeight: number;

        if (canvasRatio > availableRatio) {
          // Canvas is wider - fit to width
          imgWidth = availableWidth;
          imgHeight = availableWidth / canvasRatio;
        } else {
          // Canvas is taller - fit to height
          imgHeight = availableHeight;
          imgWidth = availableHeight * canvasRatio;
        }

        // Center the image in available space
        const xOffset = margin + (availableWidth - imgWidth) / 2;
        const yOffset = margin + headerSpace + (availableHeight - imgHeight) / 2;

        // Convert canvas to high-quality image
        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        // Add image to PDF
        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);

        // Add page title header
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(51, 51, 51);
        // Custom title for first page
        const pageTitle = i === 0
          ? `Rapor Performa ${userPanggilan} Bulan ${selectedMonth}`
          : title;
        pdf.text(pageTitle, margin, margin + 7);

        // Add page number footer
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `Halaman ${i + 1} dari ${canvases.length}`,
          pdfWidth - margin,
          pdfHeight - margin + 4,
          { align: 'right' }
        );

      }


      // Step 4: Save PDF
      console.log(`[PDF] Saving PDF file...`);
      const filename = `rapor-lengkap-${userFullName.replace(/\s+/g, '_')}-${selectedMonth}-${Date.now()}.pdf`;
      pdf.save(filename);


      // ⏱️ TOTAL PDF GENERATION TIME
      const pdfEndTime = performance.now();
      const totalTime = (pdfEndTime - pdfStartTime) / 1000;
      console.log(`[PDF GENERATOR] Complete! Total time: ${totalTime.toFixed(2)}s (${Math.floor(totalTime / 60)}m ${(totalTime % 60).toFixed(0)}s)`);

      // Success
      toast.success('PDF 5 halaman berhasil diunduh!', { id: toastId });
      announceToScreenReader('5-page PDF successfully downloaded', 'assertive');
    } catch (error) {
      console.error('[PDF] Multi-page PDF generation error:', error);
      toast.error('Gagal membuat PDF. Silakan coba lagi.', { id: toastId });
      announceToScreenReader('PDF generation failed', 'assertive');

      const pdfEndTime = performance.now();
      console.log(`[PDF GENERATOR] Failed after ${((pdfEndTime - pdfStartTime) / 1000).toFixed(2)}s`);
    } finally {
      setIsGenerating(false);
      setCurrentPage(0);
    }
  };

  return (
    <motion.button
      onClick={handleMultiPageDownload}
      disabled={isGenerating}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1.5rem',
        borderRadius: '0.75rem',
        fontWeight: '600',
        fontSize: '0.875rem',
        backgroundColor: isGenerating ? '#9ca3af' : '#111827',
        color: '#ffffff',
        border: 'none',
        cursor: isGenerating ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isGenerating ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
        opacity: isGenerating ? 0.7 : 1,
      }}
      whileHover={!isGenerating ? { scale: 1.02, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' } : {}}
      whileTap={!isGenerating ? { scale: 0.98 } : {}}
      aria-label={isGenerating ? 'Generating PDF...' : 'Download Full Report PDF'}
      className={className}
    >
      {isGenerating ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>
            {currentPage > 0
              ? `Halaman ${currentPage}/5`
              : 'Memulai...'}
          </span>
        </>
      ) : (
        <>
          <Download size={18} />
          <span>Download Rapor</span>
        </>
      )}
    </motion.button>
  );
};

export default MultiPagePDFButton;
