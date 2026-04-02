export type MaterialType = 'yarn' | 'thread/floss' | 'fabric' | 'resin' | 'needle' | 'hook' | 'other';

export type YarnWeight =
  | 'Lace (0)' | 'Fingering (1)' | 'Sport (2)' | 'DK (3)'
  | 'Worsted (4)' | 'Aran (5)' | 'Bulky (6)' | 'Super Bulky (7)' | 'Jumbo (8)';

export type NeedleType = 'straight' | 'circular' | 'DPN' | 'interchangeable' | 'crochet hook';
export type NeedleMaterial = 'bamboo' | 'metal' | 'wood' | 'plastic';
export type StashUnit = 'skeins' | 'cards' | 'yards' | 'pieces';
export type StashStatus = 'in_stash' | 'used_up' | 'reserved';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      craft_types: {
        Row: {
          created_at: string
          id: string
          is_custom: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_custom?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_custom?: boolean
          name?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          brand: string | null
          cable_length_inches: number | null
          color_code: string | null
          collection: string | null
          color_name: string | null
          created_at: string
          dye_lot: string | null
          fiber_content: string | null
          id: string
          is_favorited: boolean
          material_type: string | null
          name: string | null
          needle_material: string | null
          needle_size_mm: number | null
          needle_size_us: string | null
          needle_type: string | null
          notes: string | null
          quantity_in_stash: number | null
          stash_status: 'in_stash' | 'used_up' | 'reserved'
          stash_unit: 'skeins' | 'cards' | 'yards' | 'pieces' | null
          user_id: string
          weight_per_skein_grams: number | null
          yardage_per_skein: number | null
          yarn_weight: string | null
        }
        Insert: {
          brand?: string | null
          cable_length_inches?: number | null
          color_code?: string | null
          collection?: string | null
          color_name?: string | null
          created_at?: string
          dye_lot?: string | null
          fiber_content?: string | null
          id?: string
          is_favorited?: boolean
          material_type?: string | null
          name?: string | null
          needle_material?: string | null
          needle_size_mm?: number | null
          needle_size_us?: string | null
          needle_type?: string | null
          notes?: string | null
          quantity_in_stash?: number | null
          stash_status?: 'in_stash' | 'used_up' | 'reserved'
          stash_unit?: 'skeins' | 'cards' | 'yards' | 'pieces' | null
          user_id: string
          weight_per_skein_grams?: number | null
          yardage_per_skein?: number | null
          yarn_weight?: string | null
        }
        Update: {
          brand?: string | null
          cable_length_inches?: number | null
          color_code?: string | null
          collection?: string | null
          color_name?: string | null
          created_at?: string
          dye_lot?: string | null
          fiber_content?: string | null
          id?: string
          is_favorited?: boolean
          material_type?: string | null
          name?: string | null
          needle_material?: string | null
          needle_size_mm?: number | null
          needle_size_us?: string | null
          needle_type?: string | null
          notes?: string | null
          quantity_in_stash?: number | null
          stash_status?: 'in_stash' | 'used_up' | 'reserved'
          stash_unit?: 'skeins' | 'cards' | 'yards' | 'pieces' | null
          user_id?: string
          weight_per_skein_grams?: number | null
          yardage_per_skein?: number | null
          yarn_weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_materials: {
        Row: {
          id: string
          material_id: string
          project_id: string
          quantity_used: string | null
          usage_notes: string | null
        }
        Insert: {
          id?: string
          material_id: string
          project_id: string
          quantity_used?: string | null
          usage_notes?: string | null
        }
        Update: {
          id?: string
          material_id?: string
          project_id?: string
          quantity_used?: string | null
          usage_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_photos: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          project_id: string
          sort_order: number
          storage_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          project_id: string
          sort_order?: number
          storage_url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          project_id?: string
          sort_order?: number
          storage_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          craft_type_id: string | null
          created_at: string
          date_completed: string | null
          date_started: string | null
          hours_logged: number | null
          id: string
          is_shareable: boolean
          made_for: string | null
          pattern_designer: string | null
          pattern_name: string | null
          pattern_source: string | null
          status: string
          technique_notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          craft_type_id?: string | null
          created_at?: string
          date_completed?: string | null
          date_started?: string | null
          hours_logged?: number | null
          id?: string
          is_shareable?: boolean
          made_for?: string | null
          pattern_designer?: string | null
          pattern_name?: string | null
          pattern_source?: string | null
          status?: string
          technique_notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          craft_type_id?: string | null
          created_at?: string
          date_completed?: string | null
          date_started?: string | null
          hours_logged?: number | null
          id?: string
          is_shareable?: boolean
          made_for?: string | null
          pattern_designer?: string | null
          pattern_name?: string | null
          pattern_source?: string | null
          status?: string
          technique_notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_craft_type_id_fkey"
            columns: ["craft_type_id"]
            isOneToOne: false
            referencedRelation: "craft_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_paid: boolean
          portfolio_slug: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          is_paid?: boolean
          portfolio_slug?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_paid?: boolean
          portfolio_slug?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
