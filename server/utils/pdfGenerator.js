const jsPDF = require('jspdf');

class PDFGenerator {
  static async generateLandCertificate(land, qrCodeDataURL) {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('DIGITAL LAND REGISTRY', 105, 30, { align: 'center' });
      doc.setFontSize(16);
      doc.text('LAND OWNERSHIP CERTIFICATE', 105, 45, { align: 'center' });
      
      // Certificate details
      doc.setFontSize(12);
      doc.text(`Land ID: ${land.landId}`, 20, 70);
      doc.text(`Survey Number: ${land.landDetails.surveyNumber}`, 20, 85);
      doc.text(`Village: ${land.landDetails.village}`, 20, 100);
      doc.text(`Taluka: ${land.landDetails.taluka}`, 20, 115);
      doc.text(`District: ${land.landDetails.district}`, 20, 130);
      doc.text(`State: ${land.landDetails.state}`, 20, 145);
      
      // Land details
      doc.setFontSize(14);
      doc.text('LAND DETAILS', 20, 170);
      doc.setFontSize(11);
      doc.text(`Area: ${land.landDetails.area.acres || 0} Acres, ${land.landDetails.area.guntas || 0} Guntas`, 20, 185);
      doc.text(`Land Type: ${land.landDetails.landType}`, 20, 200);
      doc.text(`Classification: ${land.landDetails.classification || 'N/A'}`, 20, 215);
      
      if (land.currentOwner) {
        doc.text(`Current Owner: ${land.currentOwner.fullName}`, 20, 230);
      }
      
      // Add QR code
      doc.addImage(qrCodeDataURL, 'PNG', 150, 130, 40, 40);
      doc.text('Scan to verify', 160, 180);
      
      // Footer
      doc.setFontSize(10);
      doc.text('This certificate is digitally verified and secured', 105, 250, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 265, { align: 'center' });
      
      return doc.output();
    } catch (error) {
      console.error('Error generating land certificate:', error);
      throw error;
    }
  }

  static async generateTransactionCertificate(transaction, land, qrCodeDataURL) {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('LAND REGISTRY DEPARTMENT', 105, 30, { align: 'center' });
      doc.setFontSize(16);
      doc.text('TRANSACTION CERTIFICATE', 105, 45, { align: 'center' });
      
      // Transaction details
      doc.setFontSize(12);
      doc.text(`Transaction ID: ${transaction.transactionId}`, 20, 70);
      doc.text(`Land ID: ${land.landId}`, 20, 85);
      doc.text(`Transaction Type: ${transaction.transactionType}`, 20, 100);
      doc.text(`Date: ${new Date(transaction.createdAt).toLocaleDateString()}`, 20, 115);
      doc.text(`Amount: ₹${transaction.agreedPrice.toLocaleString()}`, 20, 130);
      
      // Parties
      doc.setFontSize(14);
      doc.text('TRANSACTION PARTIES', 20, 155);
      doc.setFontSize(11);
      doc.text(`Seller: ${transaction.seller.fullName}`, 20, 170);
      doc.text(`Buyer: ${transaction.buyer.fullName}`, 20, 185);
      
      // Property details
      doc.setFontSize(14);
      doc.text('PROPERTY DETAILS', 20, 210);
      doc.setFontSize(11);
      doc.text(`Survey Number: ${land.landDetails.surveyNumber}`, 20, 225);
      doc.text(`Location: ${land.landDetails.village}, ${land.landDetails.district}`, 20, 240);
      
      // Add QR code
      doc.addImage(qrCodeDataURL, 'PNG', 150, 130, 40, 40);
      doc.text('Scan to verify', 160, 180);
      
      // Footer
      doc.setFontSize(10);
      doc.text('This certificate is digitally signed and blockchain verified', 105, 270, { align: 'center' });
      
      return doc.output();
    } catch (error) {
      console.error('Error generating transaction certificate:', error);
      throw error;
    }
  }

  static async generateOwnershipCertificate(transaction, land, newOwner, qrCodeDataURL) {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('LAND REGISTRY DEPARTMENT', 105, 30, { align: 'center' });
      doc.setFontSize(16);
      doc.text('CERTIFICATE OF OWNERSHIP', 105, 45, { align: 'center' });
      
      // Certificate details
      doc.setFontSize(12);
      doc.text(`Registration No: ${transaction.completionDetails?.registrationNumber || 'PENDING'}`, 20, 70);
      doc.text(`Land ID: ${land.landId}`, 20, 85);
      doc.text(`Transaction ID: ${transaction.transactionId}`, 20, 100);
      doc.text(`Date of Transfer: ${new Date().toLocaleDateString()}`, 20, 115);
      
      // Property details
      doc.setFontSize(14);
      doc.text('PROPERTY DETAILS', 20, 140);
      doc.setFontSize(11);
      doc.text(`Survey Number: ${land.landDetails.surveyNumber}`, 20, 155);
      doc.text(`Location: ${land.landDetails.village}, ${land.landDetails.taluka}, ${land.landDetails.district}`, 20, 170);
      doc.text(`Area: ${land.landDetails.area.acres || 0} Acres, ${land.landDetails.area.guntas || 0} Guntas`, 20, 185);
      doc.text(`Land Type: ${land.landDetails.landType}`, 20, 200);
      
      // Ownership details
      doc.setFontSize(14);
      doc.text('OWNERSHIP DETAILS', 20, 220);
      doc.setFontSize(11);
      doc.text(`New Owner: ${newOwner.fullName}`, 20, 235);
      doc.text(`Purchase Price: ₹${transaction.agreedPrice.toLocaleString()}`, 20, 250);
      
      // Add QR code
      doc.addImage(qrCodeDataURL, 'PNG', 150, 130, 40, 40);
      doc.text('Scan to verify', 160, 180);
      
      // Footer
      doc.setFontSize(10);
      doc.text('This certificate is digitally signed and blockchain verified', 105, 280, { align: 'center' });
      
      return doc.output();
    } catch (error) {
      console.error('Error generating ownership certificate:', error);
      throw error;
    }
  }
}

module.exports = PDFGenerator;