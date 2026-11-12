/** localStorage key of the API bearer token (also kept in step with Supabase's token). */
export const TOKEN_STORAGE_KEY = 'token';
/** localStorage key of the Go API refresh token (accounts that sign in through the Go API). */
export const REFRESH_TOKEN_STORAGE_KEY = 'refreshToken';
/** localStorage key of the signed-in user's id (set on login, removed on logout). */
export const USER_ID_STORAGE_KEY = 'nexo-user-id';
/** localStorage key of the colour theme ('dark' | 'light'). */
export const THEME_STORAGE_KEY = 'theme';
/** localStorage key of the desktop side bar state ('visible' | 'hidden'). */
export const SIDEBAR_STORAGE_KEY = 'nexo-sidebar';
/** Prefix of form drafts saved by older versions; removed on logout. */
export const LEGACY_DRAFT_KEY_PREFIX = 'nexo-draft:';
