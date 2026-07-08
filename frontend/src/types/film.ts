export interface Scene {
  id: number;
  title: string;
  narration: string;
  mood: string;
  duration?: string;

  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;

  imagePrompt?: string;
  audioPrompt?: string;
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