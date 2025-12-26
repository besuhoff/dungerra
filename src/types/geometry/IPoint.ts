export interface IPoint {
  x: number;
  y: number;
  setTo(x: number, y: number): IPoint;
  setToPointCoordinates(point: IPoint): IPoint;
  clone(): IPoint;
  equals(point: IPoint): boolean;
  invert(): IPoint;
  inverted(): IPoint;
  moveBy(dx: number, dy: number): IPoint;
  movedBy(dx: number, dy: number): IPoint;
  moveByPointCoordinates(point: IPoint): IPoint;
  movedByPointCoordinates(point: IPoint): IPoint;
  invertAgainstPointCoordinates(center: IPoint): IPoint;
  invertedAgainstPointCoordinates(center: IPoint): IPoint;
  rotateAroundPointCoordinates(center: IPoint, angle: number): IPoint;
  rotatedAroundPointCoordinates(center: IPoint, angle: number): IPoint;
  rotate(angle: number): IPoint;
  rotated(angle: number): IPoint;
  subtract(point: IPoint): IPoint;
  subtracted(point: IPoint): IPoint;
  distanceTo(point: IPoint): number;
  toString(): string;
}
