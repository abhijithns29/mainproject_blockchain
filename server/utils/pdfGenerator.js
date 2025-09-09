const jsPDF = require('jspdf');
const QRCode = require('qrcode');

class PDFGenerator {
  static async generateCertificate(transaction, property, certificateHash) {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('BLOCKCHAIN LAND REGISTRY', 105, 30, { align: 'center' });
      doc.setFontSize(16);
      doc.text('PROPERTY OWNERSHIP CERTIFICATE', 105, 45, { align: 'center' });
      
      // Certificate details
      doc.setFontSize(12);
      doc.text(`Certificate ID: ${certificateHash}`, 20, 70);
      doc.text(`Property ID: ${property.blockchainId}`, 20, 85);
      doc.text(`Transaction Type: ${transaction.transactionType}`, 20, 100);
      doc.text(`Date: ${new Date(transaction.createdAt).toLocaleDateString()}`, 20, 115);
      
      // Property details
      doc.setFontSize(14);
      doc.text('PROPERTY DETAILS', 20, 140);
      doc.setFontSize(11);
      doc.text(`Title: ${property.title}`, 20, 155);
      doc.text(`Location: ${property.location.address}, ${property.location.city}`, 20, 170);
      doc.text(`Size: ${property.size} sq ft`, 20, 185);
      doc.text(`Valuation: $${property.valuation.toLocaleString()}`, 20, 200);
      
      // Generate QR code for verification
      const qrCodeDataURL = await QRCode.toDataURL(
        `${process.env.FRONTEND_URL}/verify/${certificateHash}`,
        { width: 100 }
      );
      
      doc.addImage(qrCodeDataURL, 'PNG', 150, 130, 40, 40);
      doc.text('Scan to verify', 160, 180);
      
      // Footer
      doc.setFontSize(10);
      doc.text('This certificate is secured by blockchain technology', 105, 250, { align: 'center' });
      doc.text(`Blockchain Transaction Hash: ${transaction.blockchainTxHash || 'Pending'}`, 105, 265, { align: 'center' });
      
      return doc.output();
    } catch (error) {
      console.error('Error generating PDF certificate:', error);
      throw error;
    }
  }
}

module.exports = PDFGenerator;