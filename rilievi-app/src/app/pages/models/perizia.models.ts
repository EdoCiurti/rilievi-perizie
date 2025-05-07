export interface Perizia {
  _id: string;
  descrizione: string;
  cliente: string;
  indirizzo: string;
  stato: string;
  createdAt: string;
  updatedAt: string;
  immagini?: Array<{
    _id: string;
    url: string;
  }>;
  coordinate?: { latitude: number, longitude: number } | null;
}