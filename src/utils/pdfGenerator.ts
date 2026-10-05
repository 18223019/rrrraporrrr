/**
 * ========================================
 * PDF Generator - 5 Halaman Rapor Asrama
 * ========================================
 * 
 * Struktur PDF:
 * 1. Sampul (Identitas + Bulan)
 * 2. KPI Ringkas
 * 3. Radar + Bar Charts
 * 4. Line Chart (Tren) + Catatan Sistem
 * 5. Catatan Coach + Tanda Tangan
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// ========================================
// TYPES
// ========================================

export interface RaporData {
  member: {
    name: string;
    panggilan: string;
    username: string;
    slug: string;
  };
  month: string;
  scores: {
    total: number;
    kehadiran: number;
    tahfidz: number;
    kebersihan: number;
    ketertiban: number;
    muamalah: number;
  };
  history: Array<{
    month: string;
    total: number;
  }>;
  notes?: {
    sistem?: string;
    coach?: string;
  };
  coach?: {
    name: string;
    signature?: string;
  };
}

export interface PDFOptions {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  quality?: number;
  onProgress?: (progress: number) => void;
}

// ========================================
// CONSTANTS
// ========================================

const A4_WIDTH = 210; // mm
const A4_HEIGHT = 297; // mm
const MARGIN = 20; // mm
const CONTENT_WIDTH = A4_WIDTH - (MARGIN * 2);

// ========================================
// MAIN PDF GENERATOR
// ========================================

/**
 * Generate 5-page PDF rapor
 */
export async function generateRaporPDF(
  data: RaporData,
  options: PDFOptions = {}
): Promise<Blob> {
  const {
    orientation = 'portrait',
    format = 'a4',
    onProgress = () => {},
  } = options;
  
  // Create PDF document
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
    compress: true,
  });
  
  try {
    // Page 1: Sampul
    onProgress(10);
    await addCoverPage(pdf, data);
    
    // Page 2: KPI Ringkas
    onProgress(30);
    pdf.addPage();
    await addKPIPage(pdf, data);
    
    // Page 3: Radar + Bar Charts
    onProgress(50);
    pdf.addPage();
    await addChartsPage1(pdf, data);
    
    // Page 4: Line Chart + Catatan Sistem
    onProgress(70);
    pdf.addPage();
    await addChartsPage2(pdf, data);
    
    // Page 5: Catatan Coach + Tanda Tangan
    onProgress(90);
    pdf.addPage();
    await addNotesPage(pdf, data);
    
    onProgress(100);
    
    // Return as Blob
    return pdf.output('blob');
    
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
}

// ========================================
// PAGE 1: SAMPUL
// ========================================

async function addCoverPage(pdf: jsPDF, data: RaporData) {
  const { member, month, scores } = data;
  
  // Background gradient (simulated)
  pdf.setFillColor(164, 132, 99); // rapor brown
  pdf.rect(0, 0, A4_WIDTH, A4_HEIGHT, 'F');
  
  // Add overlay pattern (circles for decoration)
  pdf.setFillColor(255, 255, 255);
  // Note: GState requires jsPDF plugin, simplified for now
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * A4_WIDTH;
    const y = Math.random() * A4_HEIGHT;
    const r = Math.random() * 30 + 10;
    pdf.circle(x, y, r, 'F');
  }
  
  // Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(48);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Rapor Asrama', A4_WIDTH / 2, 80, { align: 'center' });
  
  // Subtitle
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Asrama Salman ITB', A4_WIDTH / 2, 95, { align: 'center' });
  
  // Month/Period
  pdf.setFontSize(20);
  const monthName = formatMonthName(month);
  pdf.text(monthName, A4_WIDTH / 2, 120, { align: 'center' });
  
  // Divider line
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN * 2, 130, A4_WIDTH - MARGIN * 2, 130);
  
  // Member Info Box
  const boxY = 150;
  const boxHeight = 80;
  
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(MARGIN * 2, boxY, CONTENT_WIDTH - MARGIN * 2, boxHeight, 5, 5, 'F');
  
  // Member details
  pdf.setTextColor(51, 51, 51);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Nama:', MARGIN * 2.5, boxY + 15);
  pdf.setFont('helvetica', 'normal');
  pdf.text(member.name, MARGIN * 2.5, boxY + 25);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Username:', MARGIN * 2.5, boxY + 40);
  pdf.setFont('helvetica', 'normal');
  pdf.text(member.username, MARGIN * 2.5, boxY + 50);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total Skor:', MARGIN * 2.5, boxY + 65);
  pdf.setFontSize(24);
  pdf.setTextColor(95, 64, 48);
  pdf.text(scores.total.toString(), MARGIN * 2.5, boxY + 78);
  
  // Footer
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'italic');
  pdf.text(
    'Dokumen ini dibuat secara otomatis pada ' + new Date().toLocaleDateString('id-ID'),
    A4_WIDTH / 2,
    A4_HEIGHT - 15,
    { align: 'center' }
  );
}

// ========================================
// PAGE 2: KPI RINGKAS
// ========================================

async function addKPIPage(pdf: jsPDF, data: RaporData) {
  const { scores } = data;
  
  // Header
  addPageHeader(pdf, 'Ringkasan Performa');
  
  // KPI Cards
  const kpis: Array<{ label: string; value: number | string; color: [number, number, number] }> = [
    { label: 'Total Skor', value: scores.total, color: [95, 64, 48] },
    { label: 'Kehadiran', value: `${scores.kehadiran}%`, color: [16, 185, 129] },
    { label: 'Tahfidz', value: scores.tahfidz, color: [249, 115, 22] },
    { label: 'Kebersihan', value: scores.kebersihan, color: [139, 92, 246] },
    { label: 'Ketertiban', value: scores.ketertiban, color: [236, 72, 153] },
    { label: 'Muamalah', value: scores.muamalah, color: [14, 165, 233] },
  ];
  
  const cardsPerRow = 2;
  const cardWidth = (CONTENT_WIDTH - 10) / cardsPerRow;
  const cardHeight = 50;
  const startY = 50;
  
  kpis.forEach((kpi, index) => {
    const row = Math.floor(index / cardsPerRow);
    const col = index % cardsPerRow;
    const x = MARGIN + (col * (cardWidth + 10));
    const y = startY + (row * (cardHeight + 10));
    
    // Card background
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');
    
    // Accent bar
    const [r, g, b] = kpi.color;
    pdf.setFillColor(r, g, b);
    pdf.roundedRect(x, y, cardWidth, 4, 3, 3, 'F');
    
    // Label
    pdf.setFontSize(12);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'normal');
    pdf.text(kpi.label, x + 10, y + 20);
    
    // Value
    pdf.setFontSize(28);
    pdf.setTextColor(r, g, b);
    pdf.setFont('helvetica', 'bold');
    pdf.text(kpi.value.toString(), x + 10, y + 40);
  });
  
  // Summary text
  const summaryY = startY + (Math.ceil(kpis.length / cardsPerRow) * (cardHeight + 10)) + 20;
  
  pdf.setFontSize(11);
  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'normal');
  
  const summaryText = `Performa bulan ini menunjukkan total skor ${scores.total} dari 100. ` +
    `Kehadiran mencapai ${scores.kehadiran}%, dengan pencapaian Tahfidz ${scores.tahfidz}. ` +
    `Nilai Kebersihan, Ketertiban, dan Muamalah masing-masing ${scores.kebersihan}, ` +
    `${scores.ketertiban}, dan ${scores.muamalah}.`;
  
  const lines = pdf.splitTextToSize(summaryText, CONTENT_WIDTH);
  pdf.text(lines, MARGIN, summaryY);
  
  // Page number
  addPageFooter(pdf, 2);
}

// ========================================
// PAGE 3: RADAR + BAR CHARTS
// ========================================

async function addChartsPage1(pdf: jsPDF, _data: RaporData) {
  // Header
  addPageHeader(pdf, 'Analisis per Kategori');
  
  // Note: In real implementation, you would:
  // 1. Create hidden canvas elements with Chart.js
  // 2. Use html2canvas to capture them
  // 3. Add images to PDF
  
  // For now, add placeholder
  pdf.setFontSize(14);
  pdf.setTextColor(71, 85, 105);
  pdf.text('📊 Radar Chart', MARGIN, 60);
  pdf.text('(Analisis komprehensif per kategori)', MARGIN, 70);
  
  // Placeholder box for radar chart
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(1);
  pdf.rect(MARGIN, 80, CONTENT_WIDTH, 80);
  
  pdf.text('📊 Bar Chart', MARGIN, 180);
  pdf.text('(Perbandingan dengan rata-rata)', MARGIN, 190);
  
  // Placeholder box for bar chart
  pdf.rect(MARGIN, 200, CONTENT_WIDTH, 60);
  
  // Page number
  addPageFooter(pdf, 3);
}

// ========================================
// PAGE 4: LINE CHART + CATATAN SISTEM
// ========================================

async function addChartsPage2(pdf: jsPDF, data: RaporData) {
  const { history, notes } = data;
  
  // Header
  addPageHeader(pdf, 'Tren Perkembangan');
  
  // Line chart placeholder
  pdf.setFontSize(14);
  pdf.setTextColor(71, 85, 105);
  pdf.text('📈 Tren 3 Bulan Terakhir', MARGIN, 60);
  
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(1);
  pdf.rect(MARGIN, 70, CONTENT_WIDTH, 80);
  
  // History summary
  if (history && history.length > 0) {
    const historyY = 160;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Riwayat Skor:', MARGIN, historyY);
    
    pdf.setFont('helvetica', 'normal');
    history.forEach((h, i) => {
      const y = historyY + 10 + (i * 7);
      pdf.text(`• ${formatMonthName(h.month)}: ${h.total}`, MARGIN + 5, y);
    });
  }
  
  // System notes
  if (notes?.sistem) {
    const notesY = 200;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('📝 Catatan Sistem:', MARGIN, notesY);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const noteLines = pdf.splitTextToSize(notes.sistem, CONTENT_WIDTH);
    pdf.text(noteLines, MARGIN, notesY + 10);
  }
  
  // Page number
  addPageFooter(pdf, 4);
}

// ========================================
// PAGE 5: CATATAN COACH + TANDA TANGAN
// ========================================

async function addNotesPage(pdf: jsPDF, data: RaporData) {
  const { notes, coach } = data;
  
  // Header
  addPageHeader(pdf, 'Catatan Coach');
  
  // Coach notes section
  const notesY = 60;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('💬 Pesan dari Coach:', MARGIN, notesY);
  
  // Notes box
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(MARGIN, notesY + 10, CONTENT_WIDTH, 100, 3, 3, 'F');
  
  if (notes?.coach) {
    pdf.setFontSize(11);
    pdf.setTextColor(71, 85, 105);
    pdf.setFont('helvetica', 'normal');
    const coachNoteLines = pdf.splitTextToSize(notes.coach, CONTENT_WIDTH - 20);
    pdf.text(coachNoteLines, MARGIN + 10, notesY + 25);
  } else {
    pdf.setFontSize(10);
    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Belum ada catatan dari coach.', MARGIN + 10, notesY + 25);
  }
  
  // Signature section
  const sigY = notesY + 130;
  
  pdf.setFontSize(11);
  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Bandung, ' + new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }), MARGIN, sigY);
  
  if (coach) {
    pdf.text('Coach,', MARGIN, sigY + 10);
    
    // Signature line
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN, sigY + 40, MARGIN + 60, sigY + 40);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(coach.name, MARGIN, sigY + 47);
  }
  
  // Closing message
  const closingY = sigY + 70;
  pdf.setFillColor(240, 253, 244);
  pdf.roundedRect(MARGIN, closingY, CONTENT_WIDTH, 40, 3, 3, 'F');
  
  pdf.setFontSize(10);
  pdf.setTextColor(22, 163, 74);
  pdf.setFont('helvetica', 'italic');
  const closingText = 'Terus semangat dalam beribadah, belajar, dan bermuamalah. ' +
    'Semoga Allah senantiasa memberkahi setiap langkah kita. Aamiin.';
  const closingLines = pdf.splitTextToSize(closingText, CONTENT_WIDTH - 20);
  pdf.text(closingLines, MARGIN + 10, closingY + 15);
  
  // Page number
  addPageFooter(pdf, 5);
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function addPageHeader(pdf: jsPDF, title: string) {
  // Title
  pdf.setFontSize(18);
  pdf.setTextColor(51, 51, 51);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, MARGIN, 30);
  
  // Underline
  pdf.setDrawColor(164, 132, 99);
  pdf.setLineWidth(2);
  pdf.line(MARGIN, 35, MARGIN + 60, 35);
}

function addPageFooter(pdf: jsPDF, pageNum: number) {
  pdf.setFontSize(9);
  pdf.setTextColor(148, 163, 184);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    `Halaman ${pageNum} dari 5`,
    A4_WIDTH / 2,
    A4_HEIGHT - 10,
    { align: 'center' }
  );
}

function formatMonthName(month: string): string {
  // Convert "Oktober25" to "Oktober 2025"
  const match = month.match(/^([A-Za-z]+)(\d{2})$/);
  if (match) {
    const monthName = match[1];
    const year = `20${match[2]}`;
    return `${monthName} ${year}`;
  }
  return month;
}

// ========================================
// ADVANCED: CAPTURE CHART AS IMAGE
// ========================================

/**
 * Capture a chart element as image and add to PDF
 */
export async function captureChartToPDF(
  pdf: jsPDF,
  chartElement: HTMLElement,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> {
  try {
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });
    
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', x, y, width, height);
    
  } catch (error) {
    console.error('Failed to capture chart:', error);
    // Add placeholder instead
    pdf.setDrawColor(203, 213, 225);
    pdf.rect(x, y, width, height);
  }
}
