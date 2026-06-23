//shared API primitives used by every service client (one per service in its own lib file).

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000";

//turn a backend-relative path (e.g. "/traffic-reader/feed/abc") into an
//absolute URL the browser can load directly.
export function absolute(path: string): string {
  return `${API_BASE}${path}`;
}

//extract an { error } message from a failed JSON response, or fall back.
export async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}
