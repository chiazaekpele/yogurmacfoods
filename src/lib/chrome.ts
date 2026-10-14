// Sign-up, sign-in and password pages show only the wordmark, top and bottom.
const BARE = ["/account/sign-up", "/account/sign-in", "/account/forgot", "/account/reset"];
export const isBarePage = (path: string) => BARE.some((p) => path === p || path.startsWith(`${p}/`));
