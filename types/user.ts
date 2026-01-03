export type UserRole = 'admin';

export interface UserData {
  email: string;
  uid: string;
  role: UserRole;
  name?: string;
}