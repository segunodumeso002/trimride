const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const inputPath = path.join(__dirname, 'TrimRide_Investor_Deck_Draft.md');
const outputPath = path.join(__dirname, 'TrimRide_Investor_Deck_Draft.pdf');

const content = fs.readFileSync(inputPath, 'utf8');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 48, bottom: 48, left: 48, right: 48 },
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

doc.info.Title = 'TrimRide Investor Deck Draft';
doc.info.Author = 'TrimRide Team';
doc.info.Subject = 'Investor pitch deck draft';
doc.info.Keywords = 'TrimRide, investor, pitch, barber, marketplace';

const lines = content.split(/\r?\n/);

function addHeading(text, level) {
  if (level === 1) {
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#111111').text(text.replace(/^#\s+/, ''), {
      align: 'left',
    });
    doc.moveDown(0.4);
  } else if (level === 2) {
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#111111').text(text.replace(/^##\s+/, ''), {
      align: 'left',
    });
    doc.moveDown(0.2);
  }
}

function addBullet(text) {
  doc.font('Helvetica').fontSize(12).fillColor('#222222').text(`- ${text}`, {
    indent: 16,
    paragraphGap: 2,
  });
}

function addParagraph(text) {
  doc.font('Helvetica').fontSize(12).fillColor('#222222').text(text, {
    paragraphGap: 4,
  });
}

for (const rawLine of lines) {
  const line = rawLine.trimEnd();

  if (!line.trim()) {
    doc.moveDown(0.2);
    continue;
  }

  if (line.startsWith('# ')) {
    addHeading(line, 1);
    continue;
  }

  if (line.startsWith('## ')) {
    addHeading(line, 2);
    continue;
  }

  if (line.startsWith('- ')) {
    addBullet(line.slice(2));
    continue;
  }

  addParagraph(line);
}

doc.end();

stream.on('finish', () => {
  console.log(`PDF generated: ${outputPath}`);
});
