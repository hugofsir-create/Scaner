import { jsPDF } from 'jspdf';

export class ExportService {
  /**
   * Saves an image in the specified format using standard download.
   */
  static async save(imageUrl: string, format: string, filename: string = 'scanned_image') {
    if (format === 'pdf') {
      await this.saveAsPdf(imageUrl, filename);
    } else {
      await this.saveAsImage(imageUrl, format, filename);
    }
  }

  /**
   * Opens the system save dialog to select location and save the file.
   * Note: Requires browser support (Chrome/Edge/Opera 86+).
   */
  static async saveWithPicker(imageUrl: string, format: string, filename: string = 'scanned_image') {
    try {
      if (!('showSaveFilePicker' in window)) {
        throw new Error('Save File Picker is not supported in this browser. Using standard download.');
      }

      const response = await fetch(imageUrl);
      const blob = await response.blob();

      const options: any = {
        suggestedName: `${filename}.${format}`,
        types: [{
          description: `${format.toUpperCase()} Image`,
          accept: {
            [`image/${format === 'jpeg' ? 'jpeg' : format}`]: [`.${format}`]
          },
        }],
      };

      if (format === 'pdf') {
        options.types[0] = {
           description: 'PDF Document',
           accept: { 'application/pdf': ['.pdf'] }
        };
      }

      const handle = await (window as any).showSaveFilePicker(options);
      const writable = await handle.createWritable();
      
      if (format === 'pdf') {
        const pdfBlob = await this.getPdfBlob(imageUrl);
        await writable.write(pdfBlob);
      } else {
        await writable.write(blob);
      }
      
      await writable.close();
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
      console.warn('Picker failed, falling back to standard download:', err);
      await this.save(imageUrl, format, filename);
    }
  }

  private static async getPdfBlob(imageUrl: string): Promise<Blob> {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context failed');
        
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height]
        });
        
        pdf.addImage(dataUrl, 'JPEG', 0, 0, img.width, img.height);
        resolve(pdf.output('blob'));
      };
      img.src = imageUrl;
    });
  }

  private static async saveAsImage(imageUrl: string, format: string, filename: string) {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private static async saveAsPdf(imageUrl: string, filename: string) {
    const blob = await this.getPdfBlob(imageUrl);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
