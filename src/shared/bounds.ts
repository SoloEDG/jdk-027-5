import type { BoundarySettings, CanvasSize, Layer, LayerRisk, RiskEdge } from "./types";

/** 编辑画布对应的设计空间，导出时以此为基础换算 */
export const DESIGN_CANVAS: CanvasSize = { id: "design", label: "设计画布", width: 1080, height: 1080, ratio: "1:1" };

/** 图层包围盒，数值为占目标尺寸的百分比 */
export type Bounds = { left: number; top: number; right: number; bottom: number };

const charUnits = (ch: string) => {
  if (ch === " ") return 0.32;
  const code = ch.codePointAt(0) ?? 0;
  // 非 ASCII 字符（中文、贴纸符号等）按 1em 估算，ASCII 按 0.56em 估算
  return code > 0xff ? 1 : 0.56;
};

/**
 * 估算图层在设计空间（1080×1080）中的渲染尺寸（未旋转）。
 * 与画布样式保持一致：padding 7px 12px，行高约 1.24em。
 */
export function estimateLayerSize(layer: Layer): { width: number; height: number } {
  const units = [...layer.content].reduce((sum, ch) => sum + charUnits(ch), 0);
  const width = (units * layer.fontSize + 24) * layer.scale;
  const height = (layer.fontSize * 1.24 + 14) * layer.scale;
  return { width, height };
}

/**
 * 计算图层在指定目标尺寸下的轴对齐包围盒（含缩放与旋转），
 * 返回值为占目标宽高的百分比。导出预览与风险评估共用此函数，
 * 保证边界随目标尺寸重新计算，而不是只看元素中心点。
 */
export function layerBoundsForSize(layer: Layer, size: CanvasSize): Bounds {
  const exportScale = size.width / DESIGN_CANVAS.width;
  const { width, height } = estimateLayerSize(layer);
  const w = width * exportScale;
  const h = height * exportScale;
  const rad = (layer.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const rotW = w * cos + h * sin;
  const rotH = w * sin + h * cos;
  const cx = (layer.x / 100) * size.width;
  const cy = (layer.y / 100) * size.height;
  return {
    left: ((cx - rotW / 2) / size.width) * 100,
    right: ((cx + rotW / 2) / size.width) * 100,
    top: ((cy - rotH / 2) / size.height) * 100,
    bottom: ((cy + rotH / 2) / size.height) * 100
  };
}

/**
 * 基于图层当前包围盒评估风险：
 * - 任一边进入出血区（越过出血边界）→ "bleed"，导出时会被裁切；
 * - 任一边越出安全区但未入出血区 → "caution"；
 * - 否则 "safe"。
 * 边界设置或图层任意属性（位置/缩放/旋转/字号/内容）变化后需重新调用。
 */
export function evaluateLayerRisk(layer: Layer, settings: BoundarySettings, size: CanvasSize = DESIGN_CANVAS): LayerRisk {
  const bounds = layerBoundsForSize(layer, size);
  const edges: LayerRisk["edges"] = [];
  const visit = (edge: RiskEdge, inset: number) => {
    if (inset < settings.bleedMargin) edges.push({ edge, bleed: true });
    else if (inset < settings.safeMargin) edges.push({ edge, bleed: false });
  };
  visit("left", bounds.left);
  visit("right", 100 - bounds.right);
  visit("top", bounds.top);
  visit("bottom", 100 - bounds.bottom);
  const level = edges.some((item) => item.bleed) ? "bleed" : edges.length > 0 ? "caution" : "safe";
  return { level, edges };
}

export const riskEdgeLabels: Record<RiskEdge, string> = { left: "左", right: "右", top: "上", bottom: "下" };

/** 生成可展示的风险描述，引用图层当前边界越界的具体边 */
export function describeRisk(layer: Layer, risk: LayerRisk): string {
  if (risk.level === "safe") return "";
  const edges = risk.edges.map((item) => riskEdgeLabels[item.edge]).join("/");
  return risk.level === "bleed"
    ? `「${layer.name}」${edges}侧边界进入出血区，导出将被裁切`
    : `「${layer.name}」${edges}侧边界超出安全区`;
}
