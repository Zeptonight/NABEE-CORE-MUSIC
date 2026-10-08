import { config, GITHUB_AUTHORIZE_URL, GITHUB_TOKEN_URL, GITHUB_USER_URL } from '../config.js';
import { randomToken, safeEqual } from '../security/crypto.js';
import { fetchJson } from '../util.js';

export interface GithubUser {
  id: number; // immutable numeric id — the only valid identity for ownership
  login: string;
  avatar_url: string;
}

export function githubConfigured(): boolean {
  return Boolean(config.githubClientId && config.githubClientSecret);
}

export function ownerIdsConfigured(): boolean {
  return config.githubOwnerIds.length > 0;
}

export function isOwnerGithubId(githubId: number): boolean {
  return config.githubOwnerIds.includes(String(githubId));
}

export function buildAuthorizeUrl(state: string): string {
  const redirectUri = `${config.baseUrl}/api/auth/github/callback`;
  const q = new URLSearchParams({
    client_id: config.githubClientId,
    redirect_uri: redirectUri,
    scope: 'read:user',
    state,
    allow_signup: 'false',
  });
  return `${GITHUB_AUTHORIZE_URL}?${q.toString()}`;
}

/** Validate the state param against the state cookie (CSRF protection for the OAuth flow). */
export function validState(state: string | undefined, cookieState: string | undefined): boolean {
  return Boolean(state && cookieState && state.length >= 16 && safeEqual(state, cookieState));
}

export function newState(): string {
  return randomToken(24);
}

interface GhTokenResp {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export async function exchangeCode(code: string): Promise<string> {
  const { status, json } = await fetchJson(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.githubClientId,
      client_secret: config.githubClientSecret,
      code,
      redirect_uri: `${config.baseUrl}/api/auth/github/callback`,
    }),
  });
  const resp = json as GhTokenResp;
  if (status !== 200 || !resp?.access_token) {
    const desc = resp?.error_description ?? resp?.error ?? `HTTP ${status}`;
    throw new Error(`GITHUB_TOKEN_EXCHANGE_FAILED: ${desc}`);
  }
  return resp.access_token;
}

export async function fetchGithubUser(accessToken: string): Promise<GithubUser> {
  const { status, json } = await fetchJson(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'NABEE-CORE-MUSIC',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (status !== 200 || !json?.id) {
    throw new Error(`GITHUB_USER_FETCH_FAILED: HTTP ${status}`);
  }
  return { id: Number(json.id), login: String(json.login), avatar_url: String(json.avatar_url ?? '') };
}
