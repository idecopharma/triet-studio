/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Character {
  id: string;
  name: string; // Starts with @
  outfits: string;
  description: string;
  images: string[]; // Base64 data URLs (1-3 images)
  isLocked: boolean;
}

export interface Product {
  name: string;
  description: string;
  image: string; // Base64 data URL
}

export interface ScreenplayScene {
  sceneNumber: number;
  duration: number; // 8 or 10
  visualPrompt: string; // Video prompt for generation models
  audioPrompt: string; // Voiceover (lời thoại) matching the scene duration
  notes: string; // Context, emotion, background notes
}

export interface Screenplay {
  id: string;
  idea: string;
  totalDuration: number; // e.g., 8, 20, 24, 30, 32, 40
  durationGroup: '10s' | '8s';
  scenes: ScreenplayScene[];
  createdAt: string;
}
