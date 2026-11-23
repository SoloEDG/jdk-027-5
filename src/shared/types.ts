export type ElementKind = "text" | "sticker";

export type CanvasSize = {
  id: string;
  label: string;
  width: number;
  height: number;
  ratio: string;
};

export type Layer = {
  id: string;
  kind: ElementKind;
  name: string;
  content: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
  fontSize: number;
  opacity: number;
};

export type BackgroundAsset = {
  id: string;
  label: string;
  style: string;
  accent: string;
};

export type StickerAsset = {
  id: string;
  label: string;
  glyph: string;
  color: string;
};

export type BoundarySettings = {
  /** 安全区内边距（占画布宽高的百分比） */
  safeMargin: number;
  /** 出血区内边距（占画布宽高的百分比），小于 safeMargin */
  bleedMargin: number;
  /** 编辑画布上是否显示辅助线 */
  showOnCanvas: boolean;
  /** 导出预览中是否显示辅助线（最终图片永远不包含辅助线） */
  showInPreview: boolean;
};

export type RiskLevel = "safe" | "caution" | "bleed";

export type RiskEdge = "left" | "right" | "top" | "bottom";

export type LayerRisk = {
  level: RiskLevel;
  /** 越界的边及其是否进入出血区 */
  edges: { edge: RiskEdge; bleed: boolean }[];
};

export type Preset = {
  id: string;
  label: string;
  description: string;
  canvas: CanvasSize;
  backgroundId: string;
  positions: { x: number; y: number; scale: number; rotation: number }[];
};
