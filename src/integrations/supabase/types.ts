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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      estudos: {
        Row: {
          created_at: string
          dono_id: string | null
          id: string
          is_public: boolean | null
          questoes: Json | null
          resumo: string | null
          titulo: string
        }
        Insert: {
          created_at?: string
          dono_id?: string | null
          id?: string
          is_public?: boolean | null
          questoes?: Json | null
          resumo?: string | null
          titulo: string
        }
        Update: {
          created_at?: string
          dono_id?: string | null
          id?: string
          is_public?: boolean | null
          questoes?: Json | null
          resumo?: string | null
          titulo?: string
        }
        Relationships: []
      }
      flashcard_baralhos: {
        Row: {
          cor: string | null
          created_at: string
          dono_id: string | null
          id: string
          nome: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          dono_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          dono_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          baralho_id: string | null
          concluido: boolean | null
          created_at: string
          frente: string
          id: string
          verso: string
        }
        Insert: {
          baralho_id?: string | null
          concluido?: boolean | null
          created_at?: string
          frente: string
          id?: string
          verso: string
        }
        Update: {
          baralho_id?: string | null
          concluido?: boolean | null
          created_at?: string
          frente?: string
          id?: string
          verso?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_baralho_id_fkey"
            columns: ["baralho_id"]
            isOneToOne: false
            referencedRelation: "flashcard_baralhos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico: {
        Row: {
          created_at: string
          detalhes: Json | null
          dono_id: string | null
          estudo_id: string | null
          id: string
          nota: number | null
          tipo: string
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          dono_id?: string | null
          estudo_id?: string | null
          id?: string
          nota?: number | null
          tipo: string
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          dono_id?: string | null
          estudo_id?: string | null
          id?: string
          nota?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_estudo_id_fkey"
            columns: ["estudo_id"]
            isOneToOne: false
            referencedRelation: "estudos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          criado_at: string | null
          data_nascimento: string | null
          email: string
          foto_url: string | null
          id: string
          is_accepted: boolean | null
          is_admin: boolean | null
          nome: string
        }
        Insert: {
          criado_at?: string | null
          data_nascimento?: string | null
          email: string
          foto_url?: string | null
          id: string
          is_accepted?: boolean | null
          is_admin?: boolean | null
          nome: string
        }
        Update: {
          criado_at?: string | null
          data_nascimento?: string | null
          email?: string
          foto_url?: string | null
          id?: string
          is_accepted?: boolean | null
          is_admin?: boolean | null
          nome?: string
        }
        Relationships: []
      }
      quiz_progresso: {
        Row: {
          estudo_id: string | null
          finalizado: boolean | null
          id: string
          perfil_id: string | null
          respostas: Json | null
          updated_at: string
        }
        Insert: {
          estudo_id?: string | null
          finalizado?: boolean | null
          id?: string
          perfil_id?: string | null
          respostas?: Json | null
          updated_at?: string
        }
        Update: {
          estudo_id?: string | null
          finalizado?: boolean | null
          id?: string
          perfil_id?: string | null
          respostas?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_progresso_estudo_id_fkey"
            columns: ["estudo_id"]
            isOneToOne: false
            referencedRelation: "estudos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
