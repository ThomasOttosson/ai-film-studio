export interface Scene {
  id: number;
  title: string;
  narration: string;
  mood: string;
  duration: string;
  imageUrl?: string;
  imagePrompt?: string;
}

export interface FilmProject {
  id: string;
  title: string;
  description: string;
  genre: string;
  style: string;
  scenes: Scene[];
}