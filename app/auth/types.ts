export interface FormData {
  email: string;
  password: string;
  name: string;
  adminCode: string;
  userCode: string;
}

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PASSWORD_MIN_LENGTH = 6;
export const NAME_MIN_LENGTH = 2;

// Hard-code the secrets directly to avoid any environment variable issues
export const ADMIN_SECRET = "8X#k9P$mN2@vL5";