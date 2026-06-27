const pdfmake = require('pdfmake');
const fs = require('fs');

pdfmake.setFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
});

const docDefinition = {
  defaultStyle: { font: 'Helvetica' },
  content: [
    'First paragraph',
    'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines'
  ]
};

const pdfDoc = pdfmake.createPdf(docDefinition);
pdfDoc.getStream().pipe(fs.createWriteStream('document.pdf'));
