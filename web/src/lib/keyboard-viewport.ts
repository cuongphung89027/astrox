export function keyboardOccludes({
  editable,
  baseline,
  visible,
  scale,
}: {
  editable: boolean;
  baseline: number;
  visible: number;
  scale: number;
}) {
  return editable && scale <= 1.05 && baseline - visible > 120;
}
