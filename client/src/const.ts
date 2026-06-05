export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (type: "signIn" | "signUp" = "signIn") => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  // If env vars are missing, avoid throwing a runtime URL error in the browser.
  if (!oauthPortalUrl || !appId) {
    // If an OAuth portal isn't configured, but we do have a client id, build
    // a direct Google OAuth authorization URL so the client can still start
    // an OAuth flow.
    if (appId) {
      try {
        const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        google.searchParams.set('client_id', appId);
        google.searchParams.set('redirect_uri', redirectUri);
        google.searchParams.set('response_type', 'code');
        google.searchParams.set('scope', 'openid email profile');
        google.searchParams.set('state', state);
        google.searchParams.set('access_type', 'offline');
        google.searchParams.set('include_granted_scopes', 'true');
        // prompt=consent ensures a refresh token in some accounts
        google.searchParams.set('prompt', 'consent');

        return google.toString();
      } catch (e) {
        console.warn('getLoginUrl: Failed to build Google OAuth URL', e);
        return '#';
      }
    }

    // Returning '#' prevents navigation while making the missing-config visible in console.
    console.warn('getLoginUrl: VITE_OAUTH_PORTAL_URL or VITE_APP_ID is not set.');
    return '#';
  }

  try {
    const base = oauthPortalUrl.replace(/\/+$|\\s+/g, "");
    const url = new URL(`${base}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", type);

    return url.toString();
  } catch (e) {
    console.warn('getLoginUrl: Failed to build URL', e);
    return '#';
  }
};
