import { IPoint } from "../../types/geometry/IPoint";

export class Point2D implements IPoint {
  constructor(
    private _x: number,
    private _y: number
  ) {}

  public get x(): number {
    return this._x;
  }

  public get y(): number {
    return this._y;
  }

  toString(): string {
    return `(${this._x.toFixed(2)}, ${this._y.toFixed(2)})`;
  }

  equals(point: IPoint): boolean {
    return this._x === point.x && this._y === point.y;
  }

  subtract(point: IPoint): Point2D {
    this._x -= point.x;
    this._y -= point.y;
    return this;
  }

  subtracted(point: IPoint): Point2D {
    return this.clone().subtract(point);
  }

  clone(): Point2D {
    return new Point2D(this._x, this._y);
  }

  setTo(x: number, y: number): Point2D {
    this._x = x;
    this._y = y;
    return this;
  }

  setToPointCoordinates(point: Point2D): Point2D {
    return this.setTo(point.x, point.y);
  }

  moveBy(dx: number, dy: number): Point2D {
    this._x += dx;
    this._y += dy;
    return this;
  }

  movedBy(dx: number, dy: number): Point2D {
    return this.clone().moveBy(dx, dy);
  }

  moveByPointCoordinates(point: Point2D): Point2D {
    return this.moveBy(point.x, point.y);
  }

  movedByPointCoordinates(point: Point2D): Point2D {
    return this.clone().moveByPointCoordinates(point);
  }

  invertAgainstPointCoordinates(center: Point2D): Point2D {
    return this.moveBy(2 * (center.x - this._x), 2 * (center.y - this._y));
  }

  invertedAgainstPointCoordinates(center: Point2D): Point2D {
    return this.clone().invertAgainstPointCoordinates(center);
  }

  invert(): Point2D {
    return this.invertAgainstPointCoordinates(new Point2D(0, 0));
  }

  inverted(): Point2D {
    return this.clone().invert();
  }

  rotateAroundPointCoordinates(center: Point2D, angle: number): Point2D {
    const cos = Math.cos((angle * Math.PI) / 180);
    const sin = Math.sin((angle * Math.PI) / 180);
    const dx = this._x - center._x;
    const dy = this._y - center.y;
    this._x = dx * cos - dy * sin + center._x;
    this._y = dx * sin + dy * cos + center.y;
    return this;
  }

  rotatedAroundPointCoordinates(center: Point2D, angle: number): Point2D {
    return this.clone().rotateAroundPointCoordinates(center, angle);
  }

  rotate(angle: number): Point2D {
    return this.rotateAroundPointCoordinates(new Point2D(0, 0), angle);
  }

  rotated(angle: number): Point2D {
    return this.clone().rotate(angle);
  }

  distanceTo(point: IPoint): number {
    return Math.sqrt((this._x - point.x) ** 2 + (this.y - point.y) ** 2);
  }
}
