export type AppRole = 'admin_global' | 'admin_sede' | 'especialista' | 'tecnica';

export interface User {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}
