import type { Dispatch, SetStateAction } from "react";
import { AlertTriangle, Download, FileImage, Maximize2 } from "lucide-react";
import { DESIGN_CANVAS, evaluateLayerRisk } from "@/shared/bounds";
import type { BackgroundAsset, BoundarySettings, CanvasSize, Layer } from "@/shared/types";

type ExportPanelProps = {
  sizes: CanvasSize[];
  selected: CanvasSize;
  layers: Layer[];
  background: BackgroundAsset;
  boundary: BoundarySettings;
  onChange: Dispatch<SetStateAction<CanvasSize>>;
  onBoundaryChange: (patch: Partial<BoundarySettings>) => void;
  onExport: () => void;
};

const PREVIEW_WIDTH = 228;

export function ExportPanel({ sizes, selected, layers, background, boundary, onChange, onBoundaryChange, onExport }: ExportPanelProps) {
  // 预览按目标尺寸重算：位置按百分比映射射，字号与 downloadPng 一样随宽度缩放
  const previewScale = PREVIEW_WIDTH / selected.width;
  const fontScale = (selected.width / DESIGN_CANVAS.width) * previewScale;
  const risks = layers
    .map((layer) => ({ layer, risk: evaluateLayerRisk(layer, boundary, selected) }))
    .filter((item) => item.risk.level !== "safe");

  return <section className="export-panel">
    <div className="export-title"><div><span className="eyebrow">03 / DELIVERY</span><h2>导出设置</h2></div><FileImage size={17} /></div>
    <div className="size-picker">{sizes.map((size) => <button key={size.id} className={selected.id === size.id ? "active" : ""} onClick={() => onChange(size)}><span>{size.ratio}</span><small>{size.label}</small></button>)}</div>

    <div className="preview-block">
      <div className="section-label">
        <span>导出预览</span>
        <label className="check-label compact">
          <input type="checkbox" checked={boundary.showInPreview} onChange={(event) => onBoundaryChange({ showInPreview: event.target.checked })} />
          辅助线
        </label>
      </div>
      <div className="export-preview" style={{ width: PREVIEW_WIDTH, height: selected.height * previewScale, background: background.style }}>
        {layers.map((layer) => {
          const risk = evaluateLayerRisk(layer, boundary, selected);
          return <span
            key={layer.id}
            className={`preview-layer ${layer.kind} ${risk.level !== "safe" ? `risk-${risk.level}` : ""}`}
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`,
              color: layer.color,
              fontSize: `${layer.fontSize * fontScale}px`,
              opacity: layer.opacity
            }}
          >{layer.content}</span>;
        })}
        {boundary.showInPreview && <>
          <div className="guide-boundary bleed" style={{ inset: `${boundary.bleedMargin}%` }}><span>出血区</span></div>
          <div className="guide-boundary safe" style={{ inset: `${boundary.safeMargin}%` }}><span>安全区</span></div>
        </>}
      </div>
      <p className="preview-note">边界已按 {selected.width}×{selected.height} 重算 · 辅助线不会写入导出图片</p>
      {risks.length > 0
        ? <div className="preview-risk"><AlertTriangle size={13} /><span>{risks.length} 个图层超出安全区：{risks.map((item) => item.layer.name).join("、")}</span></div>
        : <div className="preview-ok">✓ 全部图层在安全区内</div>}
    </div>

    <div className="export-meta"><span><Maximize2 size={14} />{selected.width} × {selected.height}px</span><span>PNG · 当前背景</span></div>
    <button className="export-button" onClick={onExport}><Download size={17} />导出图片</button>
  </section>;
}

type PngExport = { background: BackgroundAsset; layers: Layer[]; size: CanvasSize };

// 注意：安全区/出血区辅助线只是编辑与预览阶段的叠加层，这里绝不绘制，
// 保证最终导出的 PNG 不包含任何辅助线。
export function downloadPng({ background, layers, size }: PngExport) {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) return;
  const colors: Record<string, [string, string]> = {
    afterglow: ["#19172e", "#e46b55"],
    mint: ["#113c44", "#d3eaa2"],
    paper: ["#453d35", "#e5c999"],
    signal: ["#521a28", "#f08761"]
  };
  const drawGradient = () => {
    const [start, end] = colors[background.id] ?? ["#202531", "#6678a8"];
    const gradient = context.createLinearGradient(0, 0, size.width, size.height);
    gradient.addColorStop(0, start);
    gradient.addColorStop(1, end);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size.width, size.height);
  };
  const drawLayers = () => {
    const scale = size.width / 1080;
    layers.forEach((layer) => {
    context.save();
    context.translate((layer.x / 100) * size.width, (layer.y / 100) * size.height);
    context.rotate((layer.rotation * Math.PI) / 180);
    context.globalAlpha = layer.opacity;
    context.fillStyle = layer.color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `${layer.kind === "text" ? "700" : "400"} ${layer.fontSize * scale}px ${layer.kind === "text" ? "DM Sans" : "Georgia"}`;
    context.fillText(layer.content, 0, 0);
    context.restore();
    });
  };
  const save = () => canvas.toBlob((blob) => {
    if (!blob) return;
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `posture-${size.id}.png`;
    link.click();
    URL.revokeObjectURL(href);
  }, "image/png");
  const imageUrl = background.style.match(/^url\("([^"]+)"\)/)?.[1];
  if (imageUrl) {
    const image = document.createElement("img");
    image.onload = () => {
      const coverScale = Math.max(size.width / image.naturalWidth, size.height / image.naturalHeight);
      const width = image.naturalWidth * coverScale;
      const height = image.naturalHeight * coverScale;
      context.drawImage(image, (size.width - width) / 2, (size.height - height) / 2, width, height);
      drawLayers();
      save();
    };
    image.onerror = () => { drawGradient(); drawLayers(); save(); };
    image.src = imageUrl;
    return;
  }
  drawGradient();
  drawLayers();
  save();
}
