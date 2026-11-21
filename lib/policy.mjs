export function priceVisible(enabled, expiresAt, now = Date.now()) {
  return Boolean(enabled) && (!expiresAt || Date.parse(expiresAt) > now);
}

export function pagination(pageValue, limitValue, maxLimit = 24) {
  const page = Math.max(1, Math.floor(Number(pageValue) || 1));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(limitValue) || maxLimit)));
  return { page, limit, offset: (page - 1) * limit };
}

const COMMON = new Set(['password1', 'password123', 'qwerty123', 'welcome123', 'admin123', 'iloveyou1', 'abc12345', 'letmein123']);
export function validPassword(password, mobile) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 72 &&
    /[A-Za-z]/.test(password) && /\d/.test(password) && password !== mobile &&
    !COMMON.has(password.toLowerCase());
}

export function cloudinaryProductId(value) {
  return typeof value === 'string' && /^protech\/products\/[a-f0-9-]{36}$/.test(value);
}

export function hasRole(principal, role) {
  return Boolean(principal && principal.role === role);
}

export function canRequestUpload(role) {
  return role === 'admin';
}

export function lockoutState(failed, lockedUntil, now = Date.now()) {
  if (lockedUntil && Date.parse(lockedUntil) > now) return { locked: true, failed };
  const next = failed + 1;
  return next >= 5
    ? { locked: true, failed: 0, lockedUntil: new Date(now + 15 * 60_000).toISOString() }
    : { locked: false, failed: next, lockedUntil: null };
}
