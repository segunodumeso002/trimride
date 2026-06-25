const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const [, , inputArg, outputArg] = process.argv;

if (!inputArg) {
  console.error('Usage: node generate_markdown_pdf.js <input.md> [output.pdf]');
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputArg);
const outputPath = outputArg
  ? path.resolve(process.cwd(), outputArg)
  : inputPath.replace(/\.md$/i, '.pdf');

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

const content = fs.readFileSync(inputPath, 'utf8');
const lines = content.split(/\r?\n/);

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 48, bottom: 48, left: 48, right: 48 },
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

doc.info.Title = path.basename(outputPath, '.pdf');
doc.info.Author = 'TrimRide Team';

for (const rawLine of lines) {
  const line = rawLine.trimEnd();

  if (!line.trim()) {
    doc.moveDown(0.2);
    continue;
  }

  if (line.startsWith('# ')) {
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111111').text(line.replace(/^#\s+/, ''));
    doc.moveDown(0.35);
    continue;
  }

  if (line.startsWith('## ')) {
    doc.moveDown(0.45);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#111111').text(line.replace(/^##\s+/, ''));
    doc.moveDown(0.1);
    continue;
  }

  if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
    doc.font('Helvetica').fontSize(11.5).fillColor('#222222').text(line, {
      indent: 12,
      paragraphGap: 1,
    });
    continue;
  }

  if (line.startsWith('- ')) {
    doc.font('Helvetica').fontSize(11.5).fillColor('#222222').text(`- ${line.slice(2)}`, {
      indent: 12,
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
