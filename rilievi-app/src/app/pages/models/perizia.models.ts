export interface Perizia {
    _id: string;
    stato: string;
    // Add any other properties that your Perizia object might have
    titolo?: string;
    data?: Date;
    cliente?: string;
    indirizzo?: string;
    descrizione?: string;
  }