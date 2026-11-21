// Minimal stand-ins for next/server used by the API routes under test.
export const afterCallbacks = [];
export function after(callback) {
  afterCallbacks.push(callback);
}
export class NextResponse extends Response {
  static json(body, init = {}) {
    return new NextResponse(JSON.stringify(body), { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
  }
}
export class NextRequest extends Request {
  get nextUrl() {
    return new URL(this.url);
  }
}
