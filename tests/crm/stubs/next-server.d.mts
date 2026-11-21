export declare const afterCallbacks: (() => unknown)[];
export declare class NextRequest extends Request {
  get nextUrl(): URL;
}
