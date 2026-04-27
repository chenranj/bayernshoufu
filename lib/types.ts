export type Season = {
  id: string;
  label: string;
  slug: string;
  year_start: number;
  year_end: number;
  sort_order: number;
};

export type Player = {
  id: string;
  full_name: string;
  slug: string;
  shirt_number: number | null;
  position: string | null;
  photo_path: string | null;
  is_legend: boolean;
  bio: string | null;
};

export type Jersey = {
  id: string;
  name: string;
  season_id: string;
  kit_type: 'home' | 'away' | 'third' | 'goalkeeper' | 'special' | 'training' | 'other';
  image_path: string;
  description: string | null;
  release_year: number | null;
};

export type Banner = {
  id: string;
  image_path: string;
  caption: string | null;
  sort_order: number;
  active: boolean;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  role: 'user' | 'admin';
};
