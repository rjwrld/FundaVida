// The five Costa Rican universities a TCU volunteer may come from (ADR-0017).
// Names are Spanish proper nouns shown raw (like Sede and Province values),
// never passed through t(). Most carry a well-known abbreviation; Universidad
// Fidélitas has none, so `abbreviation` is optional.
export interface University {
  name: string
  abbreviation?: string
}

export const UNIVERSITIES: readonly University[] = [
  { name: 'Universidad de Costa Rica', abbreviation: 'UCR' },
  { name: 'Universidad Nacional', abbreviation: 'UNA' },
  { name: 'Instituto Tecnológico de Costa Rica', abbreviation: 'TEC' },
  { name: 'Universidad Estatal a Distancia', abbreviation: 'UNED' },
  { name: 'Universidad Fidélitas' },
]
