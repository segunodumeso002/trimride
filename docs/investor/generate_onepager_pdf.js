const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const inputPath = path.join(__dirname, 'TrimRide_Investor_OnePager.md');
const outputPath = path.join(__dirname, 'TrimRide_Investor_OnePager.pdf');

const content = fs.readFileSync(inputPath, 'utf8');
const lines = content.split(/\r?\n/);

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 48, bottom: 48, left: 48, right: 48 },
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

doc.info.Title = 'TrimRide Investor One-Pager';
doc.info.Author = 'TrimRide Team';

doc.font('Helvetica');

for (const rawLine of lines) {
  const line = rawLine.trimEnd();
  if (!line.trim()) {
    doc.moveDown(0.2);
    continue;
  }

  if (line.startsWith('# ')) {
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').fontSize(21).fillColor('#111111').text(line.replace(/^#\s+/, ''));
    doc.moveDown(0.4);
    continue;
  }

  if (line.startsWith('## ')) {
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#111111').text(line.replace(/^##\s+/, ''));
    doc.moveDown(0.1);
    continue;
  }

  if (line.startsWith('- ')) {
    doc.font('Helvetica').fontSize(11.5).fillColor('#222222').text(`- ${line.slice(2)}`, {
      indent: 14,
      paragraphGap: 1,
    });
    continue;
  }

  doc.font('Helvetica').fontSize(11.5).fillColor('#222222').text(line, {
    paragraphGap: 3,
  });
}

doc.end();

stream.on('finish', () => {
  console.log(`PDF generated: ${outputPath}`);
});
