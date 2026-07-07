export interface Scene {
  id: number;
  title: string;
  narration: string;
  mood: string;
  duration: string;
  imageUrl?: string;
  imagePrompt?: string;
  audioUrl?: string;
  audioPrompt?: string;
  videoUrl?: string;
  videoPrompt?: string;
}

export interface FilmProject {
  id: string;
  title: string;
  description: string;
  genre: string;
  style: string;
  scenes: Scene[];
}