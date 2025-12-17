export interface IDrawable {
  draw(
    ctx: CanvasRenderingContext2D,
    uiCtx: CanvasRenderingContext2D,
    millisecondsPassed?: number
  ): void;
}
