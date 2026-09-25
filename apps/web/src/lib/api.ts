import type {
  CreateProfileRequest,
  PageCompletionRequest,
  PageCompletionResponse,
  Profile,
  SessionResponse,
  Story,
} from "@storylight/shared";

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Required on every mutation by the API's CSRF defense-in-depth check
// (section 12) — a cross-site form POST can't set a custom header.
const CLIENT_HEADER = { "x-storylight-client": "web" };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Only set Content-Type when there's a body: Fastify's JSON parser rejects
  // an application/json request with no body as invalid JSON.
  const headers: HeadersInit = init?.body
    ? { "Content-Type": "application/json", ...CLIENT_HEADER, ...init.headers }
    : { ...CLIENT_HEADER, ...init?.headers };

  const response = await fetch(`/api/v1${path}`, { ...init, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.title ?? `Request to ${path} failed`);
  }

  return response.json() as Promise<T>;
}

export function createSession(): Promise<SessionResponse> {
  return request("/session", { method: "POST" });
}

export function createProfile(body: CreateProfileRequest): Promise<Profile> {
  return request("/profiles", { method: "POST", body: JSON.stringify(body) });
}

export function getStory(id: string): Promise<Story> {
  return request(`/stories/${id}`);
}

export function postPageCompletion(
  profileId: string,
  body: PageCompletionRequest,
): Promise<PageCompletionResponse> {
  return request(`/profiles/${profileId}/page-completions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
