import { useState } from 'react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import clsx from 'clsx';

interface PDFDownloadButtonProps {
  containerId: string;
  filename?: string;
  className?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export default function PDFDownloadButton({
  containerId,
  filename = 'rapor-asrama.pdf',
  className,
  variant = 'primary',
  disabled = false,
}: PDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const generatePDF = async () => {
    if (isGenerating || disabled) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      const element = document.getElementById(containerId);
      if (!element) {
        throw new Error(`Element dengan ID "${containerId}" tidak ditemukan`);
      }

      // Step 1: Render canvas
      setProgress(20);
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      setProgress(50);

      // Step 2: Convert to image
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      setProgress(70);

      // Step 3: Calculate dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      // Step 4: Add image to PDF
      pdf.addImage(
        imgData,
        'PNG',
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio
      );

      setProgress(90);

      // Step 5: Save PDF
      pdf.save(filename);
      setProgress(100);

      // Success notification (optional)
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 500);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF. Silakan coba lagi.');
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const buttonClasses = clsx(
    'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    {
      'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm hover:shadow-md':
        variant === 'primary' && !isGenerating,
      'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500':
        variant === 'secondary' && !isGenerating,
      'bg-gray-400 text-white cursor-wait': isGenerating,
    },
    className
  );

  return (
    <motion.button
      onClick={generatePDF}
      disabled={disabled || isGenerating}
      className={buttonClasses}
      whileHover={!isGenerating && !disabled ? { scale: 1.02 } : {}}
      whileTap={!isGenerating && !disabled ? { scale: 0.98 } : {}}
      aria-label={isGenerating ? 'Membuat PDF...' : 'Download Rapor PDF'}
    >
      {isGenerating ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Membuat PDF... {progress}%</span>
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>Download PDF</span>
        </>
      )}
    </motion.button>
  );
}

/**
 * Generate PDF programmatically (untuk digunakan di tempat lain)
 */
export async function generatePDF(
  containerId: string,
  filename: string = 'rapor-asrama.pdf'
): Promise<void> {
  const element = document.getElementById(containerId);
  if (!element) {
    throw new Error(`Element dengan ID "${containerId}" tidak ditemukan`);
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const imgX = (pdfWidth - imgWidth * ratio) / 2;
  const imgY = 0;

  pdf.addImage(
    imgData,
    'PNG',
    imgX,
    imgY,
    imgWidth * ratio,
    imgHeight * ratio
  );

  pdf.save(filename);
}
