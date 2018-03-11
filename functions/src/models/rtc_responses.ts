export interface StopTime {
  depart: string;
  departMinutes: number;
  ntr: boolean;
}

export interface BusLine {
  noParcours: string;
  description: string;
  codeDirection: string;
  descriptionDirection: string;
  codeTypeServics: number;
  accessible: boolean;
}

export interface BusStop {
  noArret: string;
  nom: string;
  description: string;
  latitude: number;
  longitude: number;
  accessible: boolean;
}

export interface BusLineStopTime {
  parcours: BusLine;
  arret: BusStop;
  arretNonDesservi: boolean;
  parcoursX: boolean;
  parcoursDetour: boolean;
  horaires: StopTime[];
}
