export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      avaliacoes: {
        Row: {
          criado_em: string
          data: string | null
          id: string
          materia_id: string
          nome: string
          nota: number | null
          perfil_id: string
        }
        Insert: {
          criado_em?: string
          data?: string | null
          id?: string
          materia_id: string
          nome: string
          nota?: number | null
          perfil_id: string
        }
        Update: {
          criado_em?: string
          data?: string | null
          id?: string
          materia_id?: string
          nome?: string
          nota?: number | null
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          cor: string
          criado_em: string
          criado_por: string | null
          id: string
          nome: string
          ordem: number
          secao: string
        }
        Insert: {
          cor?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          nome: string
          ordem?: number
          secao?: string
        }
        Update: {
          cor?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          nome?: string
          ordem?: number
          secao?: string
        }
        Relationships: [
          {
            foreignKeyName: "modulos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materias: {
        Row: {
          anotacoes: string | null
          cor: string
          criado_em: string
          faltas: number
          id: string
          limite_faltas_pct: number
          media_para_passar: number
          meta: number | null
          nome: string
          nota_final: number | null
          perfil_id: string
          periodo: string | null
          total_aulas: number
        }
        Insert: {
          anotacoes?: string | null
          cor?: string
          criado_em?: string
          faltas?: number
          id?: string
          limite_faltas_pct?: number
          media_para_passar?: number
          meta?: number | null
          nome: string
          nota_final?: number | null
          perfil_id: string
          periodo?: string | null
          total_aulas?: number
        }
        Update: {
          anotacoes?: string | null
          cor?: string
          criado_em?: string
          faltas?: number
          id?: string
          limite_faltas_pct?: number
          media_para_passar?: number
          meta?: number | null
          nome?: string
          nota_final?: number | null
          perfil_id?: string
          periodo?: string | null
          total_aulas?: number
        }
        Relationships: [
          {
            foreignKeyName: "materias_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      estudos: {
        Row: {
          compartilhado: boolean | null
          criado_em: string
          id: string
          nome: string
          perfil_id: string | null
          questoes: Json | null
          resumos: Json | null
        }
        Insert: {
          compartilhado?: boolean | null
          criado_em?: string
          id?: string
          nome: string
          perfil_id?: string | null
          questoes?: Json | null
          resumos?: Json | null
        }
        Update: {
          compartilhado?: boolean | null
          criado_em?: string
          id?: string
          nome?: string
          perfil_id?: string | null
          questoes?: Json | null
          resumos?: Json | null
        }
        Relationships: []
      }
      flashcard_baralhos: {
        Row: {
          cor: string | null
          criado_em: string
          id: string
          modulo_id: string | null
          perfil_id: string | null
          titulo: string
        }
        Insert: {
          cor?: string | null
          criado_em?: string
          id?: string
          modulo_id?: string | null
          perfil_id?: string | null
          titulo: string
        }
        Update: {
          cor?: string | null
          criado_em?: string
          id?: string
          modulo_id?: string | null
          perfil_id?: string | null
          titulo?: string
        }
        Relationships: []
      }
      flashcard_perfis: {
        Row: {
          criado_em: string
          foto_url: string | null
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          foto_url?: string | null
          id: string
          nome: string
        }
        Update: {
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      flashcard_sessoes: {
        Row: {
          acertos: number
          data: string
          duvidas: number
          erros: number
          id: string
          perfil_id: string
          pontuacao: number
          total: number
        }
        Insert: {
          acertos?: number
          data?: string
          duvidas?: number
          erros?: number
          id?: string
          perfil_id: string
          pontuacao?: number
          total?: number
        }
        Update: {
          acertos?: number
          data?: string
          duvidas?: number
          erros?: number
          id?: string
          perfil_id?: string
          pontuacao?: number
          total?: number
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          baralho_id: string | null
          concluido: boolean | null
          criado_em: string
          id: string
          imagem_url: string | null
          perfil_id: string | null
          pergunta: string
          resposta: string
        }
        Insert: {
          baralho_id?: string | null
          concluido?: boolean | null
          criado_em?: string
          id?: string
          imagem_url?: string | null
          perfil_id?: string | null
          pergunta: string
          resposta: string
        }
        Update: {
          baralho_id?: string | null
          concluido?: boolean | null
          criado_em?: string
          id?: string
          imagem_url?: string | null
          perfil_id?: string | null
          pergunta?: string
          resposta?: string
        }
        Relationships: []
      }
      historico: {
        Row: {
          acertos: number
          data: string
          estudo_id: string | null
          id: string
          nome: string
          nota: number | null
          perfil_id: string | null
          respostas: Json | null
          tipo: string
          total: number
        }
        Insert: {
          acertos?: number
          data?: string
          estudo_id?: string | null
          id?: string
          nome?: string
          nota?: number | null
          perfil_id?: string | null
          respostas?: Json | null
          tipo?: string
          total?: number
        }
        Update: {
          acertos?: number
          data?: string
          estudo_id?: string | null
          id?: string
          nome?: string
          nota?: number | null
          perfil_id?: string | null
          respostas?: Json | null
          tipo?: string
          total?: number
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code_hash: string
          consumido: boolean
          consumido_em: string | null
          criado_em: string
          email: string
          expira_em: string
          id: string
          tentativas: number
        }
        Insert: {
          code_hash: string
          consumido?: boolean
          criado_em?: string
          email: string
          expira_em: string
          id?: string
          tentativas?: number
        }
        Update: {
          code_hash?: string
          consumido?: boolean
          consumido_em?: string | null
          criado_em?: string
          email?: string
          expira_em?: string
          id?: string
          tentativas?: number
        }
        Relationships: []
      }
      perfis_publicos: {
        Row: {
          foto_url: string | null
          id: string
          nome: string
        }
        Insert: {
          foto_url?: string | null
          id: string
          nome: string
        }
        Update: {
          foto_url?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
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
          periodo: string | null
          recusado_em: string | null
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
          periodo?: string | null
          recusado_em?: string | null
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
          periodo?: string | null
          recusado_em?: string | null
        }
        Relationships: []
      }
      resumo_marcas: {
        Row: {
          atualizado_em: string
          estudo_id: string
          favorito: boolean
          indice: number
          lido: boolean
          perfil_id: string
        }
        Insert: {
          atualizado_em?: string
          estudo_id: string
          favorito?: boolean
          indice: number
          lido?: boolean
          perfil_id: string
        }
        Update: {
          atualizado_em?: string
          estudo_id?: string
          favorito?: boolean
          indice?: number
          lido?: boolean
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumo_marcas_estudo_id_fkey"
            columns: ["estudo_id"]
            isOneToOne: false
            referencedRelation: "estudos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resumo_marcas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_progresso: {
        Row: {
          atualizado_em: string
          estudo_id: string
          finalizado: boolean | null
          id: string
          perfil_id: string
          respostas: Json | null
        }
        Insert: {
          atualizado_em?: string
          estudo_id: string
          finalizado?: boolean | null
          id?: string
          perfil_id: string
          respostas?: Json | null
        }
        Update: {
          atualizado_em?: string
          estudo_id?: string
          finalizado?: boolean | null
          id?: string
          perfil_id?: string
          respostas?: Json | null
        }
        Relationships: []
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
      admin_atividade: {
        Args: { p_limite?: number }
        Returns: {
          quando: string
          tipo: string
          quem: string
          foto_url: string | null
          descricao: string
          detalhe: string | null
        }[]
      }
      admin_aluna_detalhe: {
        Args: { p_id: string }
        Returns: Json
      }
      admin_usuarios: {
        Args: Record<string, never>
        Returns: {
          id: string
          nome: string
          email: string
          periodo: string | null
          foto_url: string | null
          is_admin: boolean
          is_accepted: boolean
          recusado_em: string | null
          criado_at: string
          ultimo_acesso: string | null
          data_nascimento: string | null
          quizzes: number
          nota_media: number | null
          melhor_nota: number | null
          sessoes: number
          melhor_flashcard: number | null
          baralhos: number
          cards: number
          materias: number
          resumos_lidos: number
          ultima_atividade: string | null
        }[]
      }
      admin_visao_geral: {
        Args: Record<string, never>
        Returns: Json
      }
      ranking_questoes: {
        Args: { p_estudo_id?: string | null }
        Returns: {
          perfil_id: string
          nome: string
          foto_url: string | null
          provas: number
          melhor: number
          media: number
        }[]
      }
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
