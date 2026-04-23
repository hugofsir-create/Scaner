export type ScanFormat = 'jpeg' | 'png' | 'pdf';
export type ScanColorMode = 'color' | 'grayscale' | 'monochrome';
export type ScanResolution = 75 | 150 | 200 | 300 | 600;

export interface ScannerInfo {
  id: string;
  name: string;
  ip: string;
  status: 'online' | 'offline' | 'busy';
  manufacturer?: string;
  model?: string;
}

export interface ScanJob {
  id: string;
  scannerId: string;
  timestamp: string;
  format: ScanFormat;
  resolution: ScanResolution;
  colorMode: ScanColorMode;
  imageUrl: string;
}

export interface ScanSettings {
  resolution: ScanResolution;
  colorMode: ScanColorMode;
  format: ScanFormat;
  brightness: number;
  contrast: number;
}
