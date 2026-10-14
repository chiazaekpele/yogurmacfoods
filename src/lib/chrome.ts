// Sign-up, sign-in and password pages show only the wordmark, top and bottom.
const BARE = ["/account/sign-up", "/account/sign-in", "/account/forgot", "/account/reset"];
export const isBarePage = (path: string) => BARE.some((p) => path === p || path.startsWith(`${p}/`));

// The admin panel (/admin) has its own frame, so the shop header, footer and cookie notice step aside.
export const isAdminPage = (path: string) => path === "/admin" || path.startsWith("/admin/");
