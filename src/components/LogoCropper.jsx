/**
 * Modal para recortar el logo antes de subirlo. Estilo "foto de perfil":
 * crop circular o cuadrado, zoom, drag para reposicionar.
 *
 * Output: Blob PNG cuadrado a 512x512 con fondo transparente.
 * No usa librerías externas — Canvas nativo + un poco de pointer events.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Loader2, Move } from 'lucide-react'

const OUTPUT_SIZE = 512 // px del PNG resultante
const CANVAS_SIZE = 320 // px del canvas en pantalla

export default function LogoCropper({ file, onCancel, onConfirm }) {
  const canvasRef = useRef(null)
  const [img, setImg] = useState(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [shape, setShape] = useState('square') // 'square' | 'circle'
  const [saving, setSaving] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  // Cargar la imagen
  useEffect(() => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const image = new Image()
      image.onload = () => {
        setImg(image)
        // Calcular escala inicial para que la imagen llene el canvas (cover)
        const initialScale = Math.max(CANVAS_SIZE / image.width, CANVAS_SIZE / image.height)
        setScale(initialScale)
        setOffset({ x: 0, y: 0 })
        setImgLoaded(true)
      }
      image.src = e.target.result
    }
    reader.readAsDataURL(file)
  }, [file])

  // Re-dibujar el canvas cada vez que cambie scale, offset, shape o img
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')

    // Fondo transparente con checkerboard tenue (para que se vea la transparencia)
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    const tileSize = 10
    for (let y = 0; y < CANVAS_SIZE; y += tileSize) {
      for (let x = 0; x < CANVAS_SIZE; x += tileSize) {
        const isEven = ((x / tileSize) + (y / tileSize)) % 2 === 0
        ctx.fillStyle = isEven ? '#f1f5f9' : '#e2e8f0'
        ctx.fillRect(x, y, tileSize, tileSize)
      }
    }

    // Centrar imagen en el canvas con offset y escala
    const w = img.width * scale
    const h = img.height * scale
    const cx = (CANVAS_SIZE - w) / 2 + offset.x
    const cy = (CANVAS_SIZE - h) / 2 + offset.y
    ctx.drawImage(img, cx, cy, w, h)

    // Overlay con máscara (oscurece fuera del crop)
    ctx.save()
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)' // slate-900 con alpha
    if (shape === 'circle') {
      ctx.beginPath()
      ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2, true)
      ctx.fill('evenodd')
    } else {
      // Marco con padding de 4px (no oscurece nada útil pero indica borde)
      ctx.fillStyle = 'transparent'
    }
    ctx.restore()

    // Borde del crop
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    if (shape === 'circle') {
      ctx.beginPath()
      ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      ctx.strokeRect(2, 2, CANVAS_SIZE - 4, CANVAS_SIZE - 4)
    }
  }, [img, scale, offset, shape])

  // Pointer events para drag
  const onPointerDown = (e) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }
  const onPointerMove = (e) => {
    if (!isDragging) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }
  const onPointerUp = () => setIsDragging(false)

  // Wheel para zoom
  const onWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 1.1 : 0.9
    setScale((s) => Math.max(0.1, Math.min(5, s * delta)))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [onWheel])

  // Reset
  const handleReset = () => {
    if (!img) return
    const initialScale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height)
    setScale(initialScale)
    setOffset({ x: 0, y: 0 })
  }

  // Exportar el crop a PNG y devolverlo
  const handleConfirm = async () => {
    if (!img) return
    setSaving(true)
    try {
      const outCanvas = document.createElement('canvas')
      outCanvas.width = OUTPUT_SIZE
      outCanvas.height = OUTPUT_SIZE
      const ctx = outCanvas.getContext('2d')

      // Calcular qué porción de la imagen original cae dentro del canvas visible
      const w = img.width * scale
      const h = img.height * scale
      const cx = (CANVAS_SIZE - w) / 2 + offset.x
      const cy = (CANVAS_SIZE - h) / 2 + offset.y

      // El "crop" es el canvas completo (0,0) a (CANVAS_SIZE, CANVAS_SIZE)
      // Necesitamos mapear esto a píxeles de la imagen original
      const ratio = OUTPUT_SIZE / CANVAS_SIZE
      const sx = (-cx) / scale
      const sy = (-cy) / scale
      const sw = CANVAS_SIZE / scale
      const sh = CANVAS_SIZE / scale

      // Si circular, hacer clip antes de dibujar
      if (shape === 'circle') {
        ctx.save()
        ctx.beginPath()
        ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2)
        ctx.clip()
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

      if (shape === 'circle') ctx.restore()

      // Convertir a blob PNG
      const blob = await new Promise((resolve) => outCanvas.toBlob(resolve, 'image/png', 0.95))
      if (!blob) throw new Error('No se pudo generar el recorte')

      // Convertir a File con nombre original
      const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' })
      onConfirm(newFile)
    } catch (err) {
      alert('Error al recortar: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-900">Recortar logo</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Ajusta el encuadre para que tu logo se vea bien en el sidebar y en propuestas. Arrastra para mover, scroll del mouse para zoom.
        </p>

        {/* Canvas */}
        <div className="flex justify-center mb-4">
          {!imgLoaded ? (
            <div className="w-80 h-80 bg-slate-50 rounded-xl flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className={`rounded-xl border border-slate-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} touch-none select-none`}
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            />
          )}
        </div>

        {/* Controles */}
        <div className="space-y-3">
          {/* Forma */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 w-16">Forma:</span>
            <div className="inline-flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setShape('square')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  shape === 'square' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Cuadrado
              </button>
              <button
                type="button"
                onClick={() => setShape('circle')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  shape === 'circle' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Círculo
              </button>
            </div>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 w-16">Zoom:</span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.1, s * 0.9))}
              className="p-1.5 hover:bg-slate-100 rounded-md"
            >
              <ZoomOut className="w-4 h-4 text-slate-600" />
            </button>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.01"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-slate-700"
            />
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(5, s * 1.1))}
              className="p-1.5 hover:bg-slate-100 rounded-md"
            >
              <ZoomIn className="w-4 h-4 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 hover:bg-slate-100 rounded-md"
              title="Restaurar"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-slate-50 rounded-md px-2.5 py-1.5">
            <Move className="w-3 h-3" />
            Arrastra la imagen para reencuadrar · El resultado se exporta a 512×512 PNG con transparencia
          </p>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!imgLoaded || saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
            style={{ background: 'var(--brand-primary)' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Recortar y subir
          </button>
        </div>
      </div>
    </div>
  )
}
