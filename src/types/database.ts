export type MaterialType = 'yarn' | 'thread/floss' | 'fabric' | 'resin' | 'needle' | 'hook' | 'other';

export type YarnWeight =
  | 'Lace (0)' | 'Fingering (1)' | 'Sport (2)' | 'DK (3)'
  | 'Worsted (4)' | 'Aran (5)' | 'Bulky (6)' | 'Super Bulky (7)' | 'Jumbo (8)';

export type NeedleType = 'straight' | 'circular' | 'DPN' | 'interchangeable' | 'crochet hook';
export type NeedleMaterial = 'bamboo' | 'metal' | 'wood' | 'plastic';

export interface Database {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      craft_types: {
        Row: {
          id: string;
          name: string;
          is_custom: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_custom?: boolean;
        };
        Update: {
          name?: string;
          is_custom?: boolean;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          portfolio_slug: string | null;
          is_paid: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          portfolio_slug?: string | null;
          is_paid?: boolean;
        };
        Update: {
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          portfolio_slug?: string | null;
          is_paid?: boolean;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          craft_type_id: string | null;
          made_for: string | null;
          date_completed: string | null;
          pattern_source: string | null;
          technique_notes: string | null;
          is_shareable: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          craft_type_id?: string | null;
          made_for?: string | null;
          date_completed?: string | null;
          pattern_source?: string | null;
          technique_notes?: string | null;
          is_shareable?: boolean;
        };
        Update: {
          title?: string;
          craft_type_id?: string | null;
          made_for?: string | null;
          date_completed?: string | null;
          pattern_source?: string | null;
          technique_notes?: string | null;
          is_shareable?: boolean;
        };
        Relationships: [];
      };
      project_photos: {
        Row: {
          id: string;
          project_id: string;
          storage_url: string;
          is_cover: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          storage_url: string;
          is_cover?: boolean;
          sort_order?: number;
        };
        Update: {
          storage_url?: string;
          is_cover?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      materials: {
        Row: {
          id: string;
          user_id: string;
          material_type: MaterialType | null;
          brand: string | null;
          name: string | null;
          color_name: string | null;
          color_code: string | null;
          dye_lot: string | null;
          fiber_content: string | null;
          yarn_weight: YarnWeight | null;
          yardage_per_skein: number | null;
          weight_per_skein_grams: number | null;
          needle_size_mm: number | null;
          needle_size_us: string | null;
          needle_type: NeedleType | null;
          needle_material: NeedleMaterial | null;
          cable_length_inches: number | null;
          notes: string | null;
          is_favorited: boolean;
          quantity_in_stash: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          material_type?: MaterialType | null;
          brand?: string | null;
          name?: string | null;
          color_name?: string | null;
          color_code?: string | null;
          dye_lot?: string | null;
          fiber_content?: string | null;
          yarn_weight?: YarnWeight | null;
          yardage_per_skein?: number | null;
          weight_per_skein_grams?: number | null;
          needle_size_mm?: number | null;
          needle_size_us?: string | null;
          needle_type?: NeedleType | null;
          needle_material?: NeedleMaterial | null;
          cable_length_inches?: number | null;
          notes?: string | null;
          is_favorited?: boolean;
        };
        Update: {
          material_type?: MaterialType | null;
          brand?: string | null;
          name?: string | null;
          color_name?: string | null;
          color_code?: string | null;
          dye_lot?: string | null;
          fiber_content?: string | null;
          yarn_weight?: YarnWeight | null;
          yardage_per_skein?: number | null;
          weight_per_skein_grams?: number | null;
          needle_size_mm?: number | null;
          needle_size_us?: string | null;
          needle_type?: NeedleType | null;
          needle_material?: NeedleMaterial | null;
          cable_length_inches?: number | null;
          notes?: string | null;
          is_favorited?: boolean;
        };
        Relationships: [];
      };
      project_materials: {
        Row: {
          id: string;
          project_id: string;
          material_id: string;
          quantity_used: string | null;
          usage_notes: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          material_id: string;
          quantity_used?: string | null;
          usage_notes?: string | null;
        };
        Update: {
          quantity_used?: string | null;
          usage_notes?: string | null;
        };
        Relationships: [];
      };
    };
  };
}
