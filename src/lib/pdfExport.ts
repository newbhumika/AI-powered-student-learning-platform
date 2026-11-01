import { jsPDF } from 'jspdf';

/**
 * Generates and downloads a formatted academic study handout PDF from markdown/text notes.
 */
export function downloadStudyNotesPdf(params: {
  title: string;
  subject: string;
  noteType: string;
  markdownContent: string;
  studentName?: string;
  institutionName?: string;
}): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const maxWidth = pageWidth - marginX * 2;
  let cursorY = 54;

  // Header Banner
  doc.setFillColor(13, 74, 70); // Deep academic forest teal
  doc.rect(0, 0, pageWidth, 88, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(153, 246, 228); // Soft mint-teal kicker
  doc.text(
    (params.institutionName || 'AI-Powered Student Learning Assistant').toUpperCase(),
    marginX,
    30
  );

  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(params.title, maxWidth);
  doc.text(titleLines[0] || params.title, marginX, 54);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  const metaLine = [
    `Subject: ${params.subject}`,
    `Format: ${params.noteType.replace('_', ' ')}`,
    params.studentName ? `Prepared for: ${params.studentName}` : null,
    `Date: ${new Date().toLocaleDateString()}`,
  ]
    .filter(Boolean)
    .join('  ·  ');
  doc.text(metaLine, marginX, 74);

  cursorY = 116;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - 54) {
      doc.addPage();
      cursorY = 52;
    }
  };

  const lines = params.markdownContent.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      cursorY += 8;
      continue;
    }

    if (line.startsWith('# ')) {
      ensureSpace(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      const wrapped = doc.splitTextToSize(line.slice(2).trim(), maxWidth);
      doc.text(wrapped, marginX, cursorY);
      cursorY += wrapped.length * 19 + 6;
      continue;
    }

    if (line.startsWith('## ')) {
      ensureSpace(26);
      cursorY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(15, 118, 110); // Deep teal section heading
      const wrapped = doc.splitTextToSize(line.slice(3).trim(), maxWidth);
      doc.text(wrapped, marginX, cursorY);
      cursorY += wrapped.length * 16 + 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, cursorY - 2, pageWidth - marginX, cursorY - 2);
      cursorY += 8;
      continue;
    }

    if (line.startsWith('### ')) {
      ensureSpace(22);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      const wrapped = doc.splitTextToSize(line.slice(4).trim(), maxWidth);
      doc.text(wrapped, marginX, cursorY);
      cursorY += wrapped.length * 15 + 4;
      continue;
    }

    const cleaned = line
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1');

    const isBullet = cleaned.startsWith('- ') || cleaned.startsWith('* ');
    const displayLine = isBullet ? `•  ${cleaned.slice(2).trim()}` : cleaned;
    const indent = isBullet ? marginX + 8 : marginX;
    const availWidth = isBullet ? maxWidth - 8 : maxWidth;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(51, 65, 85);

    const wrapped = doc.splitTextToSize(displayLine, availWidth);
    ensureSpace(wrapped.length * 14 + 4);
    doc.text(wrapped, indent, cursorY);
    cursorY += wrapped.length * 14.5 + 3;
  }

  // Page Numbers Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `AI-Powered Student Learning Assistant  ·  Page ${p} of ${totalPages}`,
      marginX,
      pageHeight - 24
    );
  }

  const safeSlug = params.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  doc.save(`${safeSlug || 'study-notes'}.pdf`);
}
