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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    },
  },
} as const

