/**
 * PDFDownloadButton - Robust PDF Export Component
 * Automatically captures any UI changes, data updates, chart gradients
 * Works with any layout without modification
 */

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { announceToScreenReader } from '../../utils/accessibility';
import toast from 'react-hot-toast';

interface PDFDownloadButtonProps {
  /** Target element selector or ref - will capture whatever is rendered */
  targetSelector?: string;
  /** PDF filename */
  filename?: string;
  /** Button label */
  label?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Include metadata in PDF */
  includeMetadata?: boolean;
  /** PDF title for metadata */
  title?: string;
  /** PDF subtitle for metadata */
  subtitle?: string;
  /** Custom className */
  className?: string;
  /** On success callback */
  onSuccess?: () => void;
  /** On error callback */
  onError?: (error: Error) => void;
}

export const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  targetSelector = '[data-pdf-export]',
  filename,
  label = 'Download PDF',
  variant = 'primary',
  size = 'md',
  includeMetadata = true,
  title = 'Rapor Asrama',
  subtitle,
  className = '',
  onSuccess,
  onError,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-500 hover:bg-primary-600 text-white';
      case 'secondary':
        return 'bg-gray-500 hover:bg-gray-600 text-white';
      case 'outline':
        return 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50';
      default:
        return 'bg-primary-500 hover:bg-primary-600 text-white';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      case 'md':
      default:
        return 'px-4 py-2 text-base';
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    setProgress(0);

    try {
      // Step 1: Find target element
      const targetElement = document.querySelector(targetSelector) as HTMLElement;
      
      if (!targetElement) {
        throw new Error(`Target element "${targetSelector}" not found. Add data-pdf-export attribute to your main container.`);
      }

      announceToScreenReader('Generating PDF, please wait...', 'polite');
      setProgress(10);

      // Step 2: Clone element for clean capture
      const clone = targetElement.cloneNode(true) as HTMLElement;
      
      // Force all animations to complete state
      clone.querySelectorAll('*').forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          htmlEl.style.animation = 'none';
          htmlEl.style.transition = 'none';
        }
      });

      // Temporarily append clone to document (hidden)
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);

      setProgress(20);

      // Step 3: Capture as high-quality canvas
      toast.loading('Capturing content...', { id: 'pdf-gen' });
      
      const canvas = await html2canvas(clone, {
        scale: 2, // 2x resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: targetElement.scrollWidth,
        height: targetElement.scrollHeight,
        windowWidth: targetElement.scrollWidth,
        windowHeight: targetElement.scrollHeight,
        onclone: (clonedDoc) => {
          // Ensure all canvases (charts) are rendered
          const canvases = clonedDoc.querySelectorAll('canvas');
          canvases.forEach((c) => {
            c.style.opacity = '1';
          });
        },
      });

      // Remove clone
      document.body.removeChild(clone);
      setProgress(60);

      // Step 4: Create PDF with proper sizing
      toast.loading('Creating PDF...', { id: 'pdf-gen' });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = 297; // A4 height in mm
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // Calculate aspect ratio
      const ratio = canvasWidth / canvasHeight;
      let contentWidth = imgWidth - 20; // 10mm margin on each side
      let contentHeight = contentWidth / ratio;

      // Calculate number of pages needed
      const pageHeight = imgHeight - 20; // 10mm margin top/bottom
      const totalPages = Math.ceil(contentHeight / pageHeight);

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      setProgress(70);

      // Add metadata
      if (includeMetadata) {
        pdf.setProperties({
          title: title,
          subject: subtitle || 'Laporan Kinerja Asrama',
          author: 'Sistem Rapor Asrama',
          keywords: 'rapor, asrama, kinerja',
          creator: 'Rapor Asrama App',
        });

        // Add header on first page
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(51, 51, 51);
        pdf.text(title, imgWidth / 2, 12, { align: 'center' });

        if (subtitle) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(107, 114, 128);
          pdf.text(subtitle, imgWidth / 2, 18, { align: 'center' });
        }
      }

      setProgress(80);

      // Step 5: Add content (split across pages if needed)
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        // Calculate source area from canvas
        const srcY = page * (canvasHeight / totalPages);
        const srcHeight = Math.min(
          canvasHeight / totalPages,
          canvasHeight - srcY
        );

        // Create temporary canvas for this page section
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidth;
        pageCanvas.height = srcHeight;
        const pageCtx = pageCanvas.getContext('2d');

        if (pageCtx) {
          pageCtx.drawImage(
            canvas,
            0,
            srcY,
            canvasWidth,
            srcHeight,
            0,
            0,
            canvasWidth,
            srcHeight
          );

          // Convert to image and add to PDF
          const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          const yPosition = page === 0 && includeMetadata ? 24 : 10;
          const availableHeight = page === 0 && includeMetadata 
            ? pageHeight - 14 
            : pageHeight;
          
          const actualHeight = Math.min(
            contentHeight / totalPages,
            availableHeight
          );

          pdf.addImage(
            imgData,
            'JPEG',
            10,
            yPosition,
            contentWidth,
            actualHeight
          );
        }

        // Add page numbers if multiple pages
        if (totalPages > 1) {
          pdf.setFontSize(8);
          pdf.setTextColor(156, 163, 175);
          pdf.setFont('helvetica', 'normal');
          pdf.text(
            `Halaman ${page + 1} dari ${totalPages}`,
            imgWidth - 12,
            imgHeight - 6,
            { align: 'right' }
          );
        }

        setProgress(80 + (page / totalPages) * 15);
      }

      // Step 6: Add footer with timestamp
      if (includeMetadata) {
        const timestamp = new Date().toLocaleString('id-ID', {
          dateStyle: 'full',
          timeStyle: 'short',
        });
        pdf.setFontSize(7);
        pdf.setTextColor(156, 163, 175);
        pdf.text(
          `Dicetak: ${timestamp}`,
          imgWidth / 2,
          imgHeight - 6,
          { align: 'center' }
        );
      }

      setProgress(95);

      // Step 7: Save PDF
      const finalFilename = filename || `rapor-${Date.now()}.pdf`;
      pdf.save(finalFilename);

      setProgress(100);
      
      // Success feedback
      toast.success('PDF berhasil diunduh!', { id: 'pdf-gen' });
      announceToScreenReader('PDF successfully downloaded', 'assertive');
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Gagal membuat PDF. Silakan coba lagi.', { id: 'pdf-gen' });
      announceToScreenReader('PDF generation failed', 'assertive');
      
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <motion.button
      onClick={handleDownload}
      disabled={isGenerating}
      className={`
        flex items-center gap-2 rounded-lg font-medium
        transition-all duration-200 
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${className}
      `}
      whileHover={{ scale: isGenerating ? 1 : 1.02 }}
      whileTap={{ scale: isGenerating ? 1 : 0.98 }}
      aria-label={isGenerating ? 'Generating PDF...' : label}
    >
      {isGenerating ? (
        <>
          <Loader2 size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} className="animate-spin" />
          <span>
            {progress < 20 && 'Menyiapkan...'}
            {progress >= 20 && progress < 60 && 'Menangkap konten...'}
            {progress >= 60 && progress < 95 && 'Membuat PDF...'}
            {progress >= 95 && 'Menyimpan...'}
          </span>
        </>
      ) : (
        <>
          <Download size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
          <span>{label}</span>
        </>
      )}
    </motion.button>
  );
};

export default PDFDownloadButton;
