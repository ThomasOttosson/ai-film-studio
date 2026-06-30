export interface Scene {
  id: number;
  title: string;
  narration: string;
  mood: string;
  duration: string;
}

export interface FilmProject {
  id: string;
  title: string;
  description: string;
  genre: string;
  style: string;
  scenes: Scene[];
}