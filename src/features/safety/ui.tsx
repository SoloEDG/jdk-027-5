import { AlertTriangle, ShieldCheck } from "lucide-react";
import { describeRisk, evaluateLayerRisk } from "@/shared/bounds";
import type { BoundarySettings, CanvasSize, Layer } from "@/shared/types";

type BoundaryPanelProps = {
  settings: BoundarySettings;
  layers: Layer[];
  exportSize: CanvasSize;
  onChange: (patch: Partial<BoundarySettings>) => void;
};

export function BoundaryPanel({ settings, layers, exportSize, onChange }: BoundaryPanelProps) {
  // 风险提示按当前导出尺寸重算，且基于图层包围盒而非中心点；
  // 边界设置、图层或目标尺寸变化时此处会随之重新评估。
  const risks = layers
    .map((layer) => ({ layer, risk: evaluateLayerRisk(layer, settings, exportSize) }))
    .filter((item) => item.risk.level !== "safe");

  return (
    <aside className="side-panel boundary-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">SAFE AREA</span><h2>安全区与出血</h2></div>
        <ShieldCheck size={17} />
      </div>

      <label className="field-label">
        安全区内边距 <span>{settings.safeMargin}%</span>
        <input
          type="range" min="2" max="20" step="0.5" value={settings.safeMargin}
          onChange={(event) => onChange({ safeMargin: Number(event.target.value) })}
        />
      </label>
      <label className="field-label">
        出血边距 <span>{settings.bleedMargin}%</span>
        <input
          type="range" min="0" max={Math.max(0, settings.safeMargin - 1)} step="0.5" value={settings.bleedMargin}
          onChange={(event) => onChange({ bleedMargin: Number(event.target.value) })}
        />
      </label>

      <div className="guide-toggles">
        <label className="check-label">
          <input type="checkbox" checked={settings.showOnCanvas} onChange={(event) => onChange({ showOnCanvas: event.target.checked })} />
          画布显示辅助线
        </label>
        <label className="check-label">
          <input type="checkbox" checked={settings.showInPreview} onChange={(event) => onChange({ showInPreview: event.target.checked })} />
          预览带入辅助线
        </label>
      </div>

      <div className="guide-legend">
        <span><i className="legend-line safe" />安全区边界</span>
        <span><i className="legend-line bleed" />出血区边界</span>
      </div>

      <div className="risk-list">
        <div className="section-label"><span>风险提示</span><span className="muted">按 {exportSize.width}×{exportSize.height} 评估</span></div>
        {risks.length === 0
          ? <p className="risk-empty">所有图层均在安全区内。</p>
          : risks.map(({ layer, risk }) => (
            <div key={layer.id} className={`risk-item ${risk.level}`}>
              <AlertTriangle size={13} />
              <span>{describeRisk(layer, risk)}</span>
            </div>
          ))}
      </div>
    </aside>
  );
}
