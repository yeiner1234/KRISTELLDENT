// NO LONGER USED BY THE APP (since FASE 8) — the public site now reads
// branches from Supabase (src/services/branchService.ts). Kept here only as
// a reference of the real, previously-curated data for the 4 real branches,
// so it can be copied into the admin "Sedes" form (/admin/sedes) instead of
// being re-typed from scratch. Coordinates are approximate city-center
// reference points (replace with exact clinic coordinates once available).
// Opening hours are NOT included here anymore — they now live exclusively
// in Supabase's branch_schedules table, editable from the same admin form.
// The previous placeholder (never verified against a real published
// schedule) was Mon–Sat 09:00–20:00, closed Sundays, for all 4 branches.
export const legacyBranchReferenceData = [
  {
    id: 'jaen',
    name: 'Jaén',
    address: 'San Martín N° 1620',
    region: 'Jaén, Cajamarca',
    googleMapsAddress: 'San Martín 1620, Jaén, Cajamarca, Perú',
    phone: '941 572 159',
    lat: -5.7089,
    lng: -78.8095,
    active: true,
  },
  {
    id: 'bagua',
    name: 'Bagua',
    address: 'Comercio N° 367',
    region: 'Bagua, Amazonas',
    googleMapsAddress: 'Comercio 367, Bagua, Amazonas, Perú',
    phone: '971 772 760',
    lat: -5.6404,
    lng: -78.5311,
    active: true,
  },
  {
    id: 'bagua-grande',
    name: 'Bagua Grande',
    address: 'Mesones Muro N° 324',
    region: 'Utcubamba, Amazonas',
    googleMapsAddress: 'Mesones Muro 324, Bagua Grande, Utcubamba, Amazonas, Perú',
    phone: '994 906 874',
    lat: -5.758,
    lng: -78.4408,
    active: true,
  },
  {
    id: 'chiclayo',
    name: 'Chiclayo',
    address: 'Salaverry N° 1198',
    region: 'Chiclayo, Lambayeque',
    googleMapsAddress: 'Salaverry 1198, Chiclayo, Lambayeque, Perú',
    phone: null,
    lat: -6.7714,
    lng: -79.8409,
    active: true,
  },
];
