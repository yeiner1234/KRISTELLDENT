export type AppRole = 'admin_global' | 'admin_sede' | 'especialista' | 'odontologa_general' | 'tecnica';

export interface User {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}
