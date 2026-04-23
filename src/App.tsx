import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, 
  Scan, 
  FileImage, 
  Settings2, 
  History, 
  Download, 
  Trash2, 
  Link as LinkIcon, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Maximize2,
  Contrast,
  Sun
} from 'lucide-react';
import { cn } from './lib/utils';
import { ScannerInfo, ScanSettings, ScanJob, ScanFormat, ScanResolution, ScanColorMode } from './types';
import { ScannerService } from './services/scannerService';
import { ExportService } from './services/exportService';
import confetti from 'canvas-confetti';

const scannerService = ScannerService.getInstance();

export default function App() {
  const [ipAddress, setIpAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedScanner, setConnectedScanner] = useState<ScannerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<ScanSettings>({
    resolution: 300,
    colorMode: 'color',
    format: 'png',
    brightness: 0,
    contrast: 0
  });

  const [isScanning, setIsScanning] = useState(false);
  const [currentScan, setCurrentScan] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanJob[]>([]);
  const [activeTab, setActiveTab ] = useState<'scan' | 'history'>('scan');

  // Load persistent IP
  useEffect(() => {
    const savedIp = localStorage.getItem('scanlink_ip');
    if (savedIp) setIpAddress(savedIp);
  }, []);

  const handleConnect = async () => {
    if (!ipAddress) return;
    setIsConnecting(true);
    setError(null);
    try {
      const info = await scannerService.getScannerInfo(ipAddress);
      setConnectedScanner(info);
      localStorage.setItem('scanlink_ip', ipAddress);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error connecting to scanner');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleScan = async () => {
    if (!connectedScanner) return;
    setIsScanning(true);
    setError(null);
    setCurrentScan(null);
    try {
      const imageUrl = await scannerService.triggerScan(connectedScanner, settings);
      setCurrentScan(imageUrl);
      
      const newJob: ScanJob = {
        id: crypto.randomUUID(),
        scannerId: connectedScanner.id,
        timestamp: new Date().toISOString(),
        ...settings,
        imageUrl
      };
      setHistory(prev => [newJob, ...prev]);
      
      // Auto-save logic could go here, but user asked for a button
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDownload = async (imageUrl: string, format: ScanFormat) => {
    try {
      await ExportService.save(imageUrl, format);
    } catch (err) {
      setError('Export failed');
    }
  };

  const handleSaveAs = async (imageUrl: string, format: ScanFormat) => {
    try {
      await ExportService.saveWithPicker(imageUrl, format);
    } catch (err) {
      setError('Save As failed');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-bg-deep text-text-main">
      {/* Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 shrink-0 z-10 bg-bg-deep/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", connectedScanner ? "bg-brand-accent shadow-[0_0_8px_#10B981]" : "bg-white/20")} />
            <span className="text-[12px] opacity-80 font-medium whitespace-nowrap">
              {connectedScanner ? 'Network Connected' : 'System Offline'}
            </span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-1 group">
            <h1 className="text-lg font-bold tracking-[2px] text-brand-primary">SCANNER<span className="font-light text-white">HUB</span></h1>
            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <nav className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveTab('scan')}
            className={cn(
              "px-6 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all gap-2 flex items-center",
              activeTab === 'scan' ? "bg-brand-primary text-white shadow-[0_4px_15px_rgba(59,130,246,0.3)]" : "text-text-dim hover:text-white"
            )}
          >
            <Scan size={14} />
            Scanner
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-6 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all gap-2 flex items-center",
              activeTab === 'history' ? "bg-brand-primary text-white shadow-[0_4px_15px_rgba(59,130,246,0.3)]" : "text-text-dim hover:text-white"
            )}
          >
            <History size={14} />
            Registry
          </button>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <div className="text-[11px] font-mono text-text-dim uppercase tracking-tighter">v2.4.0</div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center border border-white/20 shadow-lg">
             <span className="text-[10px] font-bold">HS</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-5 gap-5">
        {/* Left Sidebar: Controls */}
        <aside className="w-[300px] flex flex-col shrink-0 gap-5">
          {/* Connection Section */}
          <div className="glass-card p-5 space-y-5">
            <span className="title-label">Network Infrastructure</span>
            
            {!connectedScanner ? (
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="GATEWAY IP (e.g. 192.168.1.50)"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder:text-text-dim/50"
                />
                <button 
                  disabled={!ipAddress || isConnecting}
                  onClick={handleConnect}
                  className="w-full bg-brand-primary hover:bg-brand-secondary disabled:opacity-50 text-white rounded-xl py-3 text-xs font-bold uppercase tracking-[2px] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(59,130,246,0.4)]"
                >
                  {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={16} />}
                  Synchronize
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {[connectedScanner].map(s => (
                  <div key={s.id} className="p-4 rounded-xl bg-brand-primary/[0.08] border border-brand-primary/30 flex justify-between items-start group">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-brand-primary">{s.name}</h3>
                      <p className="text-[10px] font-mono opacity-50">{s.ip}</p>
                    </div>
                    <button 
                      onClick={() => setConnectedScanner(null)}
                      className="text-text-dim hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Context Stats */}
          <div className="glass-card p-5 flex-1 flex flex-col">
            <span className="title-label">System Diagnostics</span>
            <div className="space-y-4 mt-2">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[11px] text-text-dim uppercase tracking-wider font-medium">Bandeja</span>
                <span className="text-[11px] font-bold text-brand-accent">Lista</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[11px] text-text-dim uppercase tracking-wider font-medium">Lámpara</span>
                <span className="text-[11px] font-bold text-orange-400">Caliente</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[11px] text-text-dim uppercase tracking-wider font-medium">Memoria</span>
                <span className="text-[11px] font-bold">84% Libre</span>
              </div>
            </div>

            <div className="mt-auto pt-6">
               <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02] text-[10px] leading-relaxed text-text-dim italic">
                 "Scanner optimization active. Ready for next optical transmission session."
               </div>
            </div>
          </div>
        </aside>

        {/* Main View Area */}
        <section className="flex-1 immersive-gradient border border-white/5 rounded-[32px] flex flex-col relative overflow-hidden shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.1),transparent_70%)] pointer-events-none" />
          
          <div className="flex justify-between items-center px-8 py-5 border-b border-white/5 relative z-10">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
               <span className="text-sm font-light tracking-wide italic opacity-70">
                 {currentScan ? 'Documento_Procesado_001' : 'En espera de transmisión...'}
               </span>
            </div>
            <div className="flex gap-3">
               <button onClick={() => setCurrentScan(null)} className="px-4 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">Clear</button>
               <button className="px-4 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">Rotate</button>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-10 relative z-10 overflow-hidden">
            {activeTab === 'scan' ? (
              <AnimatePresence mode="wait">
                {!currentScan && !isScanning ? (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center gap-8"
                  >
                    <div className="w-[300px] h-[400px] border border-white/10 bg-white/[0.01] rounded-lg relative flex items-center justify-center shadow-2xl">
                       <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" />
                       <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-brand-primary/20 shadow-[0_0_15px_#3B82F6]" />
                       <Scan size={60} className="text-white/5" />
                    </div>
                    <div className="space-y-2">
                       <p className="text-xs uppercase tracking-[3px] text-text-dim">Próxima Digitalización</p>
                       <p className="text-[10px] text-text-dim/60 italic">Optimized for high-fidelity archival output</p>
                    </div>
                  </motion.div>
                ) : isScanning ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex-1 flex flex-center flex-col items-center justify-center gap-10"
                  >
                    <div className="w-[300px] h-[400px] bg-white rounded-sm relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col p-4">
                       <motion.div 
                         initial={{ top: '0%' }}
                         animate={{ top: '100%' }}
                         transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                         className="absolute left-0 right-0 h-[2px] bg-brand-primary shadow-[0_0_20px_#3B82F6] z-20"
                       />
                       <div className="space-y-4 pt-10">
                          <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
                          <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
                          <div className="h-20 bg-slate-100 rounded w-full animate-pulse" />
                          <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse" />
                       </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                       <span className="text-xs font-mono font-bold text-brand-primary animate-pulse tracking-[4px]">CAPTURING OPTICAL STREAM</span>
                       <span className="text-[10px] text-text-dim uppercase tracking-widest font-black">Bitrate: 4.8 GBPS</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="preview"
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 flex flex-col gap-8 h-full"
                  >
                    <div className="flex-1 flex items-center justify-center relative">
                       <div className="absolute inset-0 bg-brand-primary/5 blur-3xl rounded-full" />
                       <img 
                        src={currentScan!} 
                        alt="Scanned Preview" 
                        className="max-h-full max-w-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 rounded-sm relative z-10"
                      />
                    </div>

                    <div className="p-6 border-t border-white/5 flex flex-col gap-6">
                       <div className="flex justify-center gap-8">
                         <div className="flex items-center gap-4">
                           <Sun size={14} className="text-text-dim" />
                           <input type="range" className="w-32 bg-white/5 accent-brand-primary cursor-pointer border-none" />
                         </div>
                         <div className="flex items-center gap-4">
                           <Contrast size={14} className="text-text-dim" />
                           <input type="range" className="w-32 bg-white/5 accent-brand-primary cursor-pointer border-none" />
                         </div>
                       </div>

                       <div className="flex gap-4 p-2 bg-black/40 rounded-2xl border border-white/5">
                          <button 
                            onClick={() => handleSaveAs(currentScan!, settings.format)}
                            className="flex-[2] flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-brand-primary text-white hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20"
                          >
                             <FileImage size={18} />
                             <span className="text-[10px] font-black tracking-[2px] uppercase whitespace-nowrap">Save with Explorer...</span>
                          </button>
                          
                          <div className="w-px bg-white/10 self-stretch my-2" />
                          
                          {(['png', 'jpeg', 'pdf'] as ScanFormat[]).map(fmt => (
                            <button 
                              key={fmt}
                              onClick={() => handleDownload(currentScan!, fmt)}
                              className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl hover:bg-white/5 transition-colors group"
                            >
                              <Download size={16} className="text-text-dim group-hover:text-white" />
                              <span className="text-[8px] font-black tracking-widest text-text-dim uppercase">{fmt}</span>
                            </button>
                          ))}
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex-1 flex flex-col gap-10"
              >
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
                    {history.map(job => (
                      <div key={job.id} className="glass-card overflow-hidden group cursor-pointer border-none shadow-xl">
                         <div className="aspect-[3/4] bg-black/40 overflow-hidden relative border-b border-white/10">
                            <img src={job.imageUrl} className="w-full h-full object-cover opacity-30 group-hover:opacity-80 transition-all duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                            <div className="absolute bottom-4 left-4">
                               <p className="text-[10px] font-black uppercase tracking-[2px]">{job.format}</p>
                               <p className="text-[9px] text-text-dim">{new Date(job.timestamp).toLocaleTimeString()}</p>
                            </div>
                         </div>
                         <div className="p-3 flex justify-between items-center">
                            <span className="text-[9px] font-mono text-text-dim">{job.resolution}DPI</span>
                            <Download size={14} className="text-brand-primary hover:scale-110 transition-transform" onClick={() => handleDownload(job.imageUrl, job.format)} />
                         </div>
                      </div>
                    ))}
                 </div>
              </motion.div>
            )}
          </div>

          {activeTab === 'scan' && (
            <div className="p-8 border-t border-white/5 flex justify-center relative z-20">
               <button 
                disabled={!connectedScanner || isScanning}
                onClick={handleScan}
                className={cn(
                  "w-[400px] py-4 rounded-xl font-bold uppercase tracking-[4px] text-sm transition-all relative overflow-hidden group",
                  connectedScanner && !isScanning 
                    ? "bg-brand-primary text-white shadow-[0_4px_30px_rgba(59,130,246,0.5)] active:scale-95" 
                    : "bg-white/5 text-text-dim/40 cursor-not-allowed"
                )}
              >
                {isScanning ? (
                  <span className="flex items-center justify-center gap-3">
                    <Loader2 size={20} className="animate-spin" />
                    Digitizing Process...
                  </span>
                ) : (
                  <>
                    <span className="relative z-10">Launch Optic Cycle</span>
                    <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        {/* Right Sidebar: Settings */}
        <aside className="w-[300px] flex flex-col shrink-0 gap-5">
           <div className="glass-card p-6 space-y-4">
              <span className="title-label">Output Definition</span>
              <div className="flex flex-wrap gap-2">
                 {(['pdf', 'jpeg', 'png', 'tiff'] as string[]).map(fmt => (
                    <button 
                      key={fmt}
                      onClick={() => setSettings(s => ({ ...s, format: fmt as ScanFormat }))}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        settings.format === fmt ? "bg-brand-primary border border-brand-primary shadow-[0_0_10px_#3B82F6]" : "bg-white/5 border border-white/10 text-text-dim"
                      )}
                    >
                      {fmt}
                    </button>
                 ))}
              </div>
           </div>

           <div className="glass-card p-6 space-y-4">
              <span className="title-label">Optical Density (DPI)</span>
              <select 
                value={settings.resolution}
                onChange={(e) => setSettings(s => ({ ...s, resolution: Number(e.target.value) as ScanResolution }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all appearance-none"
              >
                 <option value={150}>150 DPI (Utility)</option>
                 <option value={200}>200 DPI (Balanced)</option>
                 <option value={300}>300 DPI (Archival)</option>
                 <option value={600}>600 DPI (Fine Art)</option>
              </select>
           </div>

           <div className="glass-card p-6 space-y-4 flex-1">
              <span className="title-label">Transmission Vector</span>
              <div className="space-y-4">
                 {[
                   { label: 'Repositorio Local', checked: true },
                   { label: 'Cloud Sync (Dropbox)', checked: false },
                   { label: 'Secure Email Gateway', checked: false }
                 ].map((dest, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer group">
                       <div className={cn(
                         "w-4 h-4 rounded border flex items-center justify-center transition-all",
                         dest.checked ? "bg-brand-primary border-brand-primary" : "bg-white/5 border-white/10 group-hover:border-white/30"
                       )}>
                          {dest.checked && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                       </div>
                       <span className="text-xs font-medium text-text-dim group-hover:text-white transition-colors">{dest.label}</span>
                    </label>
                 ))}
              </div>
           </div>

           <button className="w-full border border-brand-primary/40 text-brand-primary py-3 rounded-xl text-[10px] uppercase font-black tracking-[2px] hover:bg-brand-primary hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">
             Access Output Directory
           </button>
        </aside>
      </main>

      {/* Connection Indicator Footer */}
      <footer className="h-10 bg-bg-deep border-t border-white/5 flex items-center justify-between px-8 shrink-0 z-10">
        <div className="flex items-center gap-8 text-[9px] font-mono text-text-dim/60 font-bold uppercase tracking-widest">
           <span className="flex items-center gap-2 underline decoration-brand-primary/30">System: Operational_Stable</span>
           <span className="flex items-center gap-2">Buffer: 4096_MB_Available</span>
           <span className="flex items-center gap-2">Security: AES-256_Active</span>
        </div>
        <div className="text-[10px] uppercase font-black text-text-dim/40 tracking-widest">
          Integrated P2P Optical Solution • ScanLink Labs
        </div>
      </footer>
    </div>
  );
}
