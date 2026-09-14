export type UserRole = 'ADMIN' | 'PROFESSIONAL';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
