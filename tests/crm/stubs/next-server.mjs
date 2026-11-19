// Minimal stand-ins for next/server used by the API routes under test.
export const afterCallbacks = [];
export function after(callback) {
  afterCallbacks.push(callback);
}
export class NextResponse extends Response {
  static json(body, init = {}) {
    return new Response(JSON.stringify(body), { ...init, headers: { "content-type": "application/json" } });
  }
}
export class NextRequest extends Request {}
