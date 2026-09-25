export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ability: {
        Row: {
          description_en: string
          description_ja: string
          description_ko: string
          id: number
          name_en: string
          name_ja: string
          name_ko: string
          slug: string
        }
        Insert: {
          description_en: string
          description_ja: string
          description_ko: string
          id: number
          name_en: string
          name_ja: string
          name_ko: string
          slug: string
        }
        Update: {
          description_en?: string
          description_ja?: string
          description_ko?: string
          id?: number
          name_en?: string
          name_ja?: string
          name_ko?: string
          slug?: string
        }
        Relationships: []
      }
      pokemon: {
        Row: {
          artwork_path: string
          attack: number
          defense: number
          description_en: string
          description_ja: string
          description_ko: string
          evolution: Json | null
          evolves_from_id: number | null
          genus_en: string
          genus_ja: string
          genus_ko: string
          height_dm: number
          hp: number
          id: number
          is_legendary: boolean
          is_mythical: boolean
          name_en: string
          name_ja: string
          name_ko: string
          shiny_artwork_path: string
          special_attack: number
          special_defense: number
          speed: number
          type_1: Database["public"]["Enums"]["pokemon_type"]
          type_2: Database["public"]["Enums"]["pokemon_type"] | null
          weight_hg: number
        }
        Insert: {
          artwork_path: string
          attack: number
          defense: number
          description_en: string
          description_ja: string
          description_ko: string
          evolution?: Json | null
          evolves_from_id?: number | null
          genus_en: string
          genus_ja: string
          genus_ko: string
          height_dm: number
          hp: number
          id: number
          is_legendary?: boolean
          is_mythical?: boolean
          name_en: string
          name_ja: string
          name_ko: string
          shiny_artwork_path: string
          special_attack: number
          special_defense: number
          speed: number
          type_1: Database["public"]["Enums"]["pokemon_type"]
          type_2?: Database["public"]["Enums"]["pokemon_type"] | null
          weight_hg: number
        }
        Update: {
          artwork_path?: string
          attack?: number
          defense?: number
          description_en?: string
          description_ja?: string
          description_ko?: string
          evolution?: Json | null
          evolves_from_id?: number | null
          genus_en?: string
          genus_ja?: string
          genus_ko?: string
          height_dm?: number
          hp?: number
          id?: number
          is_legendary?: boolean
          is_mythical?: boolean
          name_en?: string
          name_ja?: string
          name_ko?: string
          shiny_artwork_path?: string
          special_attack?: number
          special_defense?: number
          speed?: number
          type_1?: Database["public"]["Enums"]["pokemon_type"]
          type_2?: Database["public"]["Enums"]["pokemon_type"] | null
          weight_hg?: number
        }
        Relationships: [
          {
            foreignKeyName: "pokemon_evolves_from_id_fkey"
            columns: ["evolves_from_id"]
            isOneToOne: false
            referencedRelation: "pokemon"
            referencedColumns: ["id"]
          },
        ]
      }
      pokemon_ability: {
        Row: {
          ability_id: number
          is_hidden: boolean
          pokemon_id: number
          slot: number
        }
        Insert: {
          ability_id: number
          is_hidden?: boolean
          pokemon_id: number
          slot: number
        }
        Update: {
          ability_id?: number
          is_hidden?: boolean
          pokemon_id?: number
          slot?: number
        }
        Relationships: [
          {
            foreignKeyName: "pokemon_ability_ability_id_fkey"
            columns: ["ability_id"]
            isOneToOne: false
            referencedRelation: "ability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pokemon_ability_pokemon_id_fkey"
            columns: ["pokemon_id"]
            isOneToOne: false
            referencedRelation: "pokemon"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          created_at: string
          id: string
          nickname: string
        }
        Insert: {
          created_at?: string
          id: string
          nickname: string
        }
        Update: {
          created_at?: string
          id?: string
          nickname?: string
        }
        Relationships: []
      }
      quiz_round: {
        Row: {
          attempts: number
          created_at: string
          hint_used: boolean
          hp: number
          id: string
          pokemon_id: number
          resolved_at: string | null
          run_id: string
          score_gained: number | null
          seq: number
          status: Database["public"]["Enums"]["quiz_round_status"]
          sticker_variant: Database["public"]["Enums"]["sticker_variant"] | null
          user_id: string
          version: number
        }
        Insert: {
          attempts?: number
          created_at?: string
          hint_used?: boolean
          hp: number
          id?: string
          pokemon_id: number
          resolved_at?: string | null
          run_id: string
          score_gained?: number | null
          seq: number
          status?: Database["public"]["Enums"]["quiz_round_status"]
          sticker_variant?:
            | Database["public"]["Enums"]["sticker_variant"]
            | null
          user_id: string
          version?: number
        }
        Update: {
          attempts?: number
          created_at?: string
          hint_used?: boolean
          hp?: number
          id?: string
          pokemon_id?: number
          resolved_at?: string | null
          run_id?: string
          score_gained?: number | null
          seq?: number
          status?: Database["public"]["Enums"]["quiz_round_status"]
          sticker_variant?:
            | Database["public"]["Enums"]["sticker_variant"]
            | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_round_pokemon_id_fkey"
            columns: ["pokemon_id"]
            isOneToOne: false
            referencedRelation: "pokemon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_round_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "quiz_run"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_run: {
        Row: {
          best_combo: number
          combo: number
          end_reason: Database["public"]["Enums"]["quiz_run_end_reason"] | null
          finished_at: string | null
          id: string
          rounds_cleared: number
          score: number
          skips_left: number
          started_at: string
          status: Database["public"]["Enums"]["quiz_run_status"]
          user_id: string
        }
        Insert: {
          best_combo?: number
          combo?: number
          end_reason?: Database["public"]["Enums"]["quiz_run_end_reason"] | null
          finished_at?: string | null
          id?: string
          rounds_cleared?: number
          score?: number
          skips_left: number
          started_at?: string
          status?: Database["public"]["Enums"]["quiz_run_status"]
          user_id: string
        }
        Update: {
          best_combo?: number
          combo?: number
          end_reason?: Database["public"]["Enums"]["quiz_run_end_reason"] | null
          finished_at?: string | null
          id?: string
          rounds_cleared?: number
          score?: number
          skips_left?: number
          started_at?: string
          status?: Database["public"]["Enums"]["quiz_run_status"]
          user_id?: string
        }
        Relationships: []
      }
      user_sticker: {
        Row: {
          first_obtained_at: string
          last_obtained_at: string
          pokemon_id: number
          quantity: number
          user_id: string
          variant: Database["public"]["Enums"]["sticker_variant"]
        }
        Insert: {
          first_obtained_at?: string
          last_obtained_at?: string
          pokemon_id: number
          quantity: number
          user_id: string
          variant: Database["public"]["Enums"]["sticker_variant"]
        }
        Update: {
          first_obtained_at?: string
          last_obtained_at?: string
          pokemon_id?: number
          quantity?: number
          user_id?: string
          variant?: Database["public"]["Enums"]["sticker_variant"]
        }
        Relationships: [
          {
            foreignKeyName: "user_sticker_pokemon_id_fkey"
            columns: ["pokemon_id"]
            isOneToOne: false
            referencedRelation: "pokemon"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_inactive_guests: {
        Args: {
          p_dry_run?: boolean
          p_inactive_before?: string
          p_limit?: number
        }
        Returns: number
      }
      guest_merge_create_ticket: {
        Args: {
          p_from_user: string
          p_token_hash: string
          p_ttl_seconds: number
        }
        Returns: undefined
      }
      guest_merge_redeem: {
        Args: { p_to_user: string; p_token_hash: string }
        Returns: string
      }
      leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          best_combo: number
          nickname: string
          rank: number
          score: number
        }[]
      }
      my_leaderboard_rank: {
        Args: never
        Returns: {
          best_combo: number
          rank: number
          score: number
        }[]
      }
      quiz_commit: {
        Args: {
          p_expected_version: number
          p_next_hp?: number
          p_next_pokemon_id?: number
          p_round: Json
          p_round_id: string
          p_run: Json
          p_sticker_variant?: Database["public"]["Enums"]["sticker_variant"]
          p_user_id: string
        }
        Returns: {
          next_round_id: string
          sticker_quantity: number
        }[]
      }
      quiz_round_secret: {
        Args: { p_round_id: string; p_user_id: string }
        Returns: {
          answer_keys: string[]
          pokemon_id: number
          silhouette_path: string
        }[]
      }
      quiz_start_run: {
        Args: {
          p_hp: number
          p_pokemon_id: number
          p_skips: number
          p_user_id: string
        }
        Returns: {
          round_id: string
          run_id: string
        }[]
      }
      sync_pokemon_catalog: {
        Args: {
          p_abilities: Json
          p_pokemon: Json
          p_pokemon_abilities: Json
          p_quiz: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      pokemon_type:
        | "normal"
        | "fire"
        | "water"
        | "grass"
        | "electric"
        | "ice"
        | "fighting"
        | "poison"
        | "ground"
        | "flying"
        | "psychic"
        | "bug"
        | "rock"
        | "ghost"
        | "dragon"
        | "dark"
        | "steel"
        | "fairy"
      quiz_round_status: "active" | "cleared" | "failed" | "skipped"
      quiz_run_end_reason: "fainted" | "fled"
      quiz_run_status: "active" | "finished"
      sticker_variant: "normal" | "shiny"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      pokemon_type: [
        "normal",
        "fire",
        "water",
        "grass",
        "electric",
        "ice",
        "fighting",
        "poison",
        "ground",
        "flying",
        "psychic",
        "bug",
        "rock",
        "ghost",
        "dragon",
        "dark",
        "steel",
        "fairy",
      ],
      quiz_round_status: ["active", "cleared", "failed", "skipped"],
      quiz_run_end_reason: ["fainted", "fled"],
      quiz_run_status: ["active", "finished"],
      sticker_variant: ["normal", "shiny"],
    },
  },
} as const

