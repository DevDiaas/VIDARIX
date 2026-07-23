import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, ZoomIn, RefreshCw, Check, Trash2, Sparkles, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage?: string | null;
  userName?: string;
  onSavePhoto: (imageDataUrl: string | null) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  currentImage,
  userName = 'Cinéfilo',
  onSavePhoto
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(currentImage || null);
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setImageSrc(currentImage || null);
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setErrorMessage(null);
    }
  }, [isOpen, currentImage]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Formato inválido. Por favor envie imagens em JPG, PNG ou WebP.');
      return;
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage('A imagem selecionada é muito grande. O tamanho máximo permitido é 5 MB.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setImageSrc(reader.result as string);
        setZoom(1);
        setPanX(0);
        setPanY(0);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Drag handlers for pan offset
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageSrc || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanX(e.touches[0].clientX - dragStart.x);
    setPanY(e.touches[0].clientY - dragStart.y);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleResetPan = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleRemovePhoto = () => {
    setImageSrc(null);
    setSelectedFile(null);
    onSavePhoto(null);
    onClose();
  };

  const handleCropAndSave = async () => {
    if (!imageSrc) {
      onSavePhoto(null);
      onClose();
      return;
    }

    setIsProcessing(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const TARGET_SIZE = 512;
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      if (!ctx) throw new Error('Não foi possível inicializar o contexto 2D.');

      // Clear & Draw
      ctx.clearRect(0, 0, TARGET_SIZE, TARGET_SIZE);

      // Create smooth high-resolution scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Clip circular
      ctx.save();
      ctx.beginPath();
      ctx.arc(TARGET_SIZE / 2, TARGET_SIZE / 2, TARGET_SIZE / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Calculate placement based on zoom and pan
      const scale = zoom;
      const minDimension = Math.min(img.width, img.height);
      const renderW = (img.width / minDimension) * TARGET_SIZE * scale;
      const renderH = (img.height / minDimension) * TARGET_SIZE * scale;

      const normPanX = (panX / 200) * TARGET_SIZE;
      const normPanY = (panY / 200) * TARGET_SIZE;

      const drawX = (TARGET_SIZE - renderW) / 2 + normPanX;
      const drawY = (TARGET_SIZE - renderH) / 2 + normPanY;

      ctx.drawImage(img, drawX, drawY, renderW, renderH);
      ctx.restore();

      // Export as WebP Data URL compressed
      let dataUrl = canvas.toDataURL('image/webp', 0.88);
      if (!dataUrl || dataUrl.length < 50) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      }

      onSavePhoto(dataUrl);
      onClose();
    } catch (err) {
      console.error('Erro ao recortar imagem:', err);
      setErrorMessage('Ocorreu um erro ao processar a imagem. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#10121A] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#8B5CF6]/20 text-[#8B5CF6]">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Editar Foto de Perfil</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-[#A7A9B4] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Editor Area */}
        {imageSrc ? (
          <div className="flex flex-col items-center gap-4">
            {/* Circular Preview Viewport */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden border-2 border-[#8B5CF6] shadow-2xl bg-[#07080D] cursor-grab active:cursor-grabbing flex items-center justify-center select-none"
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Ajuste do Avatar"
                draggable={false}
                className="max-w-none transition-transform duration-75 pointer-events-none select-none"
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]" />
            </div>

            <p className="text-xs text-[#A7A9B4] text-center">
              Arraste a foto para ajustar a posição e use o controle deslizante abaixo para aplicar zoom.
            </p>

            {/* Controls */}
            <div className="w-full space-y-3 bg-[#151823] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span className="flex items-center gap-1.5 text-[#A7A9B4]">
                  <ZoomIn className="w-4 h-4 text-[#8B5CF6]" />
                  Zoom: {zoom.toFixed(1)}x
                </span>
                <button
                  onClick={handleResetPan}
                  className="text-[#8B5CF6] hover:underline flex items-center gap-1 text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  Centralizar
                </button>
              </div>

              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#8B5CF6] cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/15 rounded-2xl bg-[#151823]/50 text-center gap-4">
            <UserAvatar name={userName} size="xl" showBorder={true} />
            <div>
              <p className="text-sm font-semibold text-white">Sem foto personalizada</p>
              <p className="text-xs text-[#A7A9B4] mt-1">
                Seu perfil exibe o avatar oficial da VIDARIX com suas iniciais.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/15 transition-all text-xs font-bold flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4 text-[#8B5CF6]" />
              <span>{imageSrc ? 'Escolher outra' : 'Enviar imagem'}</span>
            </button>

            {imageSrc && (
              <button
                onClick={handleRemovePhoto}
                className="px-3 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                title="Remover foto e usar avatar padrão"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Remover</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 text-[#A7A9B4] hover:text-white hover:bg-white/10 transition-all text-xs font-semibold"
            >
              Cancelar
            </button>

            <button
              onClick={handleCropAndSave}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white hover:opacity-95 transition-all text-xs font-bold shadow-lg shadow-[#8B5CF6]/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar foto</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
