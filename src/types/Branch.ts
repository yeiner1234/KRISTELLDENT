export interface Branch {
  id: string;
  name: string;
  address: string;
  region: string | null;
  googleMapsAddress: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  active: boolean;
}
