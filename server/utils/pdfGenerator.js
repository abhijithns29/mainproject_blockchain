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
      doc.text(`Property ID: ${property.blockchainId || property.id}`, 20, 85);
      doc.text(`Transaction Type: ${transaction.transactionType}`, 20, 100);
      doc.text(`Date: ${new Date(transaction.createdAt).toLocaleDateString()}`, 20, 115);
      
      // Property details
      doc.setFontSize(14);
      doc.text('PROPERTY DETAILS', 20, 140);
      doc.setFontSize(11);
      doc.text(`Title: ${property.title}`, 20, 155);
      doc.text(`Location: ${typeof property.location === 'string' ? property.location : `${property.location.address}, ${property.location.city}`}`, 20, 170);
      doc.text(`Size: ${property.size} sq ft`, 20, 185);
      doc.text(`Valuation: $${property.valuation.toLocaleString()}`, 20, 200);
      
      // Generate QR code for verification
      const qrCodeDataURL = await QRCode.toDataURL(
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${certificateHash}`,
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
      doc.text(`Asset ID: ${land.assetId}`, 20, 70);
      doc.text(`Survey Number: ${land.surveyNumber}`, 20, 85);
      doc.text(`Village: ${land.village}`, 20, 100);
      doc.text(`Taluka: ${land.taluka}`, 20, 115);
      doc.text(`District: ${land.district}`, 20, 130);
      doc.text(`State: ${land.state}`, 20, 145);
      
      // Land details
      doc.setFontSize(14);
      doc.text('LAND DETAILS', 20, 170);
      doc.setFontSize(11);
      doc.text(`Area: ${land.area.acres || 0} Acres, ${land.area.guntas || 0} Guntas`, 20, 185);
      doc.text(`Land Type: ${land.landType}`, 20, 200);
      doc.text(`Classification: ${land.classification || 'N/A'}`, 20, 215);
      
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

  static async generateOwnershipCertificate(transaction, land, newOwner, qrCodeDataURL) {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('LAND REGISTRY DEPARTMENT', 105, 30, { align: 'center' });
      doc.setFontSize(16);
      doc.text('CERTIFICATE OF OWNERSHIP TRANSFER', 105, 45, { align: 'center' });
      
      // Certificate details
      doc.setFontSize(12);
      doc.text(`Registration No: ${transaction.completionDetails?.registrationDetails?.registrationNumber || 'PENDING'}`, 20, 70);
      doc.text(`Asset ID: ${land.assetId}`, 20, 85);
      doc.text(`Transaction ID: ${transaction._id}`, 20, 100);
      doc.text(`Date of Transfer: ${new Date().toLocaleDateString()}`, 20, 115);
      
      // Property details
      doc.setFontSize(14);
      doc.text('PROPERTY DETAILS', 20, 140);
      doc.setFontSize(11);
      doc.text(`Survey Number: ${land.surveyNumber}`, 20, 155);
      doc.text(`Location: ${land.village}, ${land.taluka}, ${land.district}, ${land.state}`, 20, 170);
      doc.text(`Area: ${land.area.acres || 0} Acres, ${land.area.guntas || 0} Guntas`, 20, 185);
      doc.text(`Land Type: ${land.landType}`, 20, 200);
      
      // Transaction details
      doc.setFontSize(14);
      doc.text('TRANSFER DETAILS', 20, 220);
      doc.setFontSize(11);
      doc.text(`New Owner: ${newOwner.fullName}`, 20, 235);
      doc.text(`Sale Price: ₹${transaction.agreedPrice.toLocaleString()}`, 20, 250);
      
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