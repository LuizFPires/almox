export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alteracao: {
        Row: {
          campo: string
          criado_em: string
          de: string | null
          id: string
          obra_id: string
          para: string | null
          registro_id: string
          tabela: string
          usuario_id: string | null
          usuario_nome: string | null
        }
        ComputedFields: never
        Insert: {
          campo: string
          criado_em?: string
          de?: string | null
          id?: string
          obra_id: string
          para?: string | null
          registro_id: string
          tabela: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          campo?: string
          criado_em?: string
          de?: string | null
          id?: string
          obra_id?: string
          para?: string | null
          registro_id?: string
          tabela?: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'alteracao_obra_id_fkey'
            columns: ['obra_id']
            isOneToOne: false
            referencedRelation: 'obra'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'alteracao_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuario'
            referencedColumns: ['id']
          },
        ]
      }
      avaria: {
        Row: {
          criado_em: string
          foto_path: string
          id: string
          motivo: Database['public']['Enums']['motivo_avaria']
          movimento_id: string
          obra_id: string
          unidade_id: string
        }
        ComputedFields: never
        Insert: {
          criado_em?: string
          foto_path: string
          id?: string
          motivo: Database['public']['Enums']['motivo_avaria']
          movimento_id: string
          obra_id: string
          unidade_id: string
        }
        Update: {
          criado_em?: string
          foto_path?: string
          id?: string
          motivo?: Database['public']['Enums']['motivo_avaria']
          movimento_id?: string
          obra_id?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'avaria_item_fk'
            columns: ['movimento_id', 'unidade_id']
            isOneToOne: false
            referencedRelation: 'movimento_item'
            referencedColumns: ['movimento_id', 'unidade_id']
          },
          {
            foreignKeyName: 'avaria_movimento_id_obra_id_fkey'
            columns: ['movimento_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'movimento'
            referencedColumns: ['id', 'obra_id']
          },
          {
            foreignKeyName: 'avaria_unidade_id_obra_id_fkey'
            columns: ['unidade_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'unidade'
            referencedColumns: ['id', 'obra_id']
          },
        ]
      }
      aviso: {
        Row: {
          atualizado_em: string
          empresa_id: string
          enviado_em: string
          fechamento_id: string
          id: string
          itens: NonNullable<Json>
          obra_id: string
          status: Database['public']['Enums']['status_aviso']
          total: number
        }
        ComputedFields: never
        Insert: {
          atualizado_em?: string
          empresa_id: string
          enviado_em?: string
          fechamento_id: string
          id?: string
          itens?: NonNullable<Json>
          obra_id: string
          status?: Database['public']['Enums']['status_aviso']
          total: number
        }
        Update: {
          atualizado_em?: string
          empresa_id?: string
          enviado_em?: string
          fechamento_id?: string
          id?: string
          itens?: NonNullable<Json>
          obra_id?: string
          status?: Database['public']['Enums']['status_aviso']
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: 'aviso_empresa_id_obra_id_fkey'
            columns: ['empresa_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'empresa'
            referencedColumns: ['id', 'obra_id']
          },
          {
            foreignKeyName: 'aviso_fechamento_id_obra_id_fkey'
            columns: ['fechamento_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'fechamento_dia'
            referencedColumns: ['id', 'obra_id']
          },
        ]
      }
      dispositivo_tv: {
        Row: {
          criado_em: string
          id: string
          nome: string
          obra_id: string
          token_hash: string
          ultimo_ping: string | null
        }
        ComputedFields: never
        Insert: {
          criado_em?: string
          id?: string
          nome: string
          obra_id: string
          token_hash: string
          ultimo_ping?: string | null
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
          obra_id?: string
          token_hash?: string
          ultimo_ping?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'dispositivo_tv_obra_id_fkey'
            columns: ['obra_id']
            isOneToOne: false
            referencedRelation: 'obra'
            referencedColumns: ['id']
          },
        ]
      }
      empresa: {
        Row: {
          cor: string
          criado_em: string
          dono_email: string | null
          dono_nome: string | null
          encarregado_email: string | null
          encarregado_pessoa_id: string | null
          id: string
          nome: string
          obra_id: string
          proxima_medicao: string | null
          tipo: Database['public']['Enums']['tipo_empresa']
        }
        ComputedFields: never
        Insert: {
          cor?: string
          criado_em?: string
          dono_email?: string | null
          dono_nome?: string | null
          encarregado_email?: string | null
          encarregado_pessoa_id?: string | null
          id?: string
          nome: string
          obra_id: string
          proxima_medicao?: string | null
          tipo: Database['public']['Enums']['tipo_empresa']
        }
        Update: {
          cor?: string
          criado_em?: string
          dono_email?: string | null
          dono_nome?: string | null
          encarregado_email?: string | null
          encarregado_pessoa_id?: string | null
          id?: string
          nome?: string
          obra_id?: string
          proxima_medicao?: string | null
          tipo?: Database['public']['Enums']['tipo_empresa']
        }
        Relationships: [
          {
            foreignKeyName: 'empresa_encarregado_fk'
            columns: ['encarregado_pessoa_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'pessoa'
            referencedColumns: ['id', 'obra_id']
          },
          {
            foreignKeyName: 'empresa_encarregado_mesma_empresa_fk'
            columns: ['encarregado_pessoa_id', 'id']
            isOneToOne: false
            referencedRelation: 'pessoa'
            referencedColumns: ['id', 'empresa_id']
          },
          {
            foreignKeyName: 'empresa_obra_id_fkey'
            columns: ['obra_id']
            isOneToOne: false
            referencedRelation: 'obra'
            referencedColumns: ['id']
          },
        ]
      }
      fechamento_dia: {
        Row: {
          automatico: boolean
          data: string
          encerrado_em: string
          encerrado_por: string | null
          id: string
          obra_id: string
        }
        ComputedFields: never
        Insert: {
          automatico?: boolean
          data: string
          encerrado_em?: string
          encerrado_por?: string | null
          id?: string
          obra_id: string
        }
        Update: {
          automatico?: boolean
          data?: string
          encerrado_em?: string
          encerrado_por?: string | null
          id?: string
          obra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fechamento_dia_encerrado_por_fkey'
            columns: ['encerrado_por']
            isOneToOne: false
            referencedRelation: 'usuario'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fechamento_dia_obra_id_fkey'
            columns: ['obra_id']
            isOneToOne: false
            referencedRelation: 'obra'
            referencedColumns: ['id']
          },
        ]
      }
      impressora: {
        Row: {
          criado_em: string
          id: string
          ip: unknown
          linguagem: Database['public']['Enums']['linguagem_impressora']
          nome: string
          obra_id: string
          porta: number
          rolo: string | null
        }
        ComputedFields: never
        Insert: {
          criado_em?: string
          id?: string
          ip: unknown
          linguagem: Database['public']['Enums']['linguagem_impressora']
          nome: string
          obra_id: string
          porta?: number
          rolo?: string | null
        }
        Update: {
          criado_em?: string
          id?: string
          ip?: unknown
          linguagem?: Database['public']['Enums']['linguagem_impressora']
          nome?: string
          obra_id?: string
          porta?: number
          rolo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'impressora_obra_id_fkey'
            columns: ['obra_id']
            isOneToOne: false
            referencedRelation: 'obra'
            referencedColumns: ['id']
          },
        ]
      }
      movimento: {
        Row: {
          conferido: boolean
          criado_em: string
          estorno_de: string | null
          id: string
          obra_id: string
          obs: string | null
          pessoa_id: string
          tipo: Database['public']['Enums']['tipo_movimento']
          usuario_id: string
          via: Database['public']['Enums']['via_movimento']
        }
        ComputedFields: never
        Insert: {
          conferido?: boolean
          criado_em?: string
          estorno_de?: string | null
          id?: string
          obra_id: string
          obs?: string | null
          pessoa_id: string
          tipo: Database['public']['Enums']['tipo_movimento']
          usuario_id: string
          via: Database['public']['Enums']['via_movimento']
        }
        Update: {
          conferido?: boolean
          criado_em?: string
          estorno_de?: string | null
          id?: string
          obra_id?: string
          obs?: string | null
          pessoa_id?: string
          tipo?: Database['public']['Enums']['tipo_movimento']
          usuario_id?: string
          via?: Database['public']['Enums']['via_movimento']
        }
        Relationships: [
          {
            foreignKeyName: 'movimento_estorno_mesma_obra_fk'
            columns: ['estorno_de', 'obra_id']
            isOneToOne: false
            referencedRelation: 'movimento'
            referencedColumns: ['id', 'obra_id']
          },
          {
            foreignKeyName: 'movimento_obra_id_fkey'
            columns: ['obra_id']
            isOneToOne: false
            referencedRelation: 'obra'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'movimento_pessoa_id_obra_id_fkey'
            columns: ['pessoa_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'pessoa'
            referencedColumns: ['id', 'obra_id']
          },
          {
            foreignKeyName: 'movimento_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuario'
            referencedColumns: ['id']
          },
        ]
      }
      movimento_item: {
        Row: {
          avariada: boolean
          movimento_id: string
          obra_id: string
          unidade_id: string
        }
        ComputedFields: never
        Insert: {
          avariada?: boolean
          movimento_id: string
          obra_id: string
          unidade_id: string
        }
        Update: {
          avariada?: boolean
          movimento_id?: string
          obra_id?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'movimento_item_movimento_id_obra_id_fkey'
            columns: ['movimento_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'movimento'
            referencedColumns: ['id', 'obra_id']
          },
          {
            foreignKeyName: 'movimento_item_unidade_id_obra_id_fkey'
            columns: ['unidade_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'unidade'
            referencedColumns: ['id', 'obra_id']
          },
        ]
      }
      obra: {
        Row: {
          ativa: boolean
          criado_em: string
          endereco: string | null
          id: string
          nome: string
        }
        ComputedFields: never
        Insert: {
          ativa?: boolean
          criado_em?: string
          endereco?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativa?: boolean
          criado_em?: string
          endereco?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      ocorrencia: {
        Row: {
          criado_em: string
          id: string
          obra_id: string
          pessoa_id: string
          tipo: Database['public']['Enums']['tipo_ocorrencia']
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          criado_em?: string
          id?: string
          obra_id: string
          pessoa_id: string
          tipo: Database['public']['Enums']['tipo_ocorrencia']
          usuario_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          obra_id?: string
          pessoa_id?: string
          tipo?: Database['public']['Enums']['tipo_ocorrencia']
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ocorrencia_pessoa_id_obra_id_fkey'
            columns: ['pessoa_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'pessoa'
            referencedColumns: ['id', 'obra_id']
          },
          {
            foreignKeyName: 'ocorrencia_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuario'
            referencedColumns: ['id']
          },
        ]
      }
      pessoa: {
        Row: {
          ativa: boolean
          criado_em: string
          empresa_id: string
          funcao: string
          id: string
          matricula: string
          nome: string
          nome_capacete: string
          obra_id: string
          qr_token: string
        }
        ComputedFields: never
        Insert: {
          ativa?: boolean
          criado_em?: string
          empresa_id: string
          funcao: string
          id?: string
          matricula?: string
          nome: string
          nome_capacete: string
          obra_id: string
          qr_token?: string
        }
        Update: {
          ativa?: boolean
          criado_em?: string
          empresa_id?: string
          funcao?: string
          id?: string
          matricula?: string
          nome?: string
          nome_capacete?: string
          obra_id?: string
          qr_token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pessoa_empresa_id_obra_id_fkey'
            columns: ['empresa_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'empresa'
            referencedColumns: ['id', 'obra_id']
          },
          {
            foreignKeyName: 'pessoa_obra_id_fkey'
            columns: ['obra_id']
            isOneToOne: false
            referencedRelation: 'obra'
            referencedColumns: ['id']
          },
        ]
      }
      posse: {
        Row: {
          desde: string
          movimento_retirada_id: string
          obra_id: string
          pessoa_id: string
          unidade_id: string
          via: Database['public']['Enums']['via_movimento']
        }
        ComputedFields: never
        Insert: {
          desde?: string
          movimento_retirada_id: string
          obra_id: string
          pessoa_id: string
          unidade_id: string
          via: Database['public']['Enums']['via_movimento']
        }
        Update: {
          desde?: string
          movimento_retirada_id?: string
          obra_id?: string
          pessoa_id?: string
          unidade_id?: string
          via?: Database['public']['Enums']['via_movimento']
        }
        Relationships: [
          {
            foreignKeyName: 'posse_item_retirada_fk'
            columns: ['movimento_retirada_id', 'unidade_id']
            isOneToOne: false
            referencedRelation: 'movimento_item'
            referencedColumns: ['movimento_id', 'unidade_id']
          },
          {
            foreignKeyName: 'posse_movimento_retirada_id_obra_id_fkey'
            columns: ['movimento_retirada_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'movimento'
            referencedColumns: ['id', 'obra_id']
          },
          {
            foreignKeyName: 'posse_pessoa_id_obra_id_fkey'
            columns: ['pessoa_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'pessoa'
            referencedColumns: ['id', 'obra_id']
          },
          {
            foreignKeyName: 'posse_unidade_id_obra_id_fkey'
            columns: ['unidade_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'unidade'
            referencedColumns: ['id', 'obra_id']
          },
        ]
      }
      tipo_ferramenta: {
        Row: {
          alto_valor: boolean
          criado_em: string
          icone: string
          id: string
          nome: string
          obra_id: string
          prefixo: string
          valor_reposicao: number
        }
        ComputedFields: never
        Insert: {
          alto_valor?: boolean
          criado_em?: string
          icone: string
          id?: string
          nome: string
          obra_id: string
          prefixo: string
          valor_reposicao: number
        }
        Update: {
          alto_valor?: boolean
          criado_em?: string
          icone?: string
          id?: string
          nome?: string
          obra_id?: string
          prefixo?: string
          valor_reposicao?: number
        }
        Relationships: [
          {
            foreignKeyName: 'tipo_ferramenta_obra_id_fkey'
            columns: ['obra_id']
            isOneToOne: false
            referencedRelation: 'obra'
            referencedColumns: ['id']
          },
        ]
      }
      trabalho_impressao: {
        Row: {
          atualizado_em: string
          copias: number
          criado_em: string
          erro: string | null
          id: string
          impressora_id: string
          obra_id: string
          payload: string
          status: Database['public']['Enums']['status_impressao']
        }
        ComputedFields: never
        Insert: {
          atualizado_em?: string
          copias?: number
          criado_em?: string
          erro?: string | null
          id?: string
          impressora_id: string
          obra_id: string
          payload: string
          status?: Database['public']['Enums']['status_impressao']
        }
        Update: {
          atualizado_em?: string
          copias?: number
          criado_em?: string
          erro?: string | null
          id?: string
          impressora_id?: string
          obra_id?: string
          payload?: string
          status?: Database['public']['Enums']['status_impressao']
        }
        Relationships: [
          {
            foreignKeyName: 'trabalho_impressao_impressora_id_obra_id_fkey'
            columns: ['impressora_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'impressora'
            referencedColumns: ['id', 'obra_id']
          },
        ]
      }
      unidade: {
        Row: {
          codigo: string
          criado_em: string
          id: string
          obra_id: string
          status: Database['public']['Enums']['status_unidade']
          tipo_id: string
        }
        ComputedFields: never
        Insert: {
          codigo: string
          criado_em?: string
          id?: string
          obra_id: string
          status?: Database['public']['Enums']['status_unidade']
          tipo_id: string
        }
        Update: {
          codigo?: string
          criado_em?: string
          id?: string
          obra_id?: string
          status?: Database['public']['Enums']['status_unidade']
          tipo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'unidade_obra_id_fkey'
            columns: ['obra_id']
            isOneToOne: false
            referencedRelation: 'obra'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'unidade_tipo_id_obra_id_fkey'
            columns: ['tipo_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'tipo_ferramenta'
            referencedColumns: ['id', 'obra_id']
          },
        ]
      }
      usuario: {
        Row: {
          criado_em: string
          email: string
          id: string
          nome: string
        }
        ComputedFields: never
        Insert: {
          criado_em?: string
          email: string
          id: string
          nome?: string
        }
        Update: {
          criado_em?: string
          email?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      usuario_obra: {
        Row: {
          criado_em: string
          empresa_id: string | null
          obra_id: string
          perfil: Database['public']['Enums']['perfil']
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          criado_em?: string
          empresa_id?: string | null
          obra_id: string
          perfil: Database['public']['Enums']['perfil']
          usuario_id: string
        }
        Update: {
          criado_em?: string
          empresa_id?: string | null
          obra_id?: string
          perfil?: Database['public']['Enums']['perfil']
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usuario_obra_empresa_id_obra_id_fkey'
            columns: ['empresa_id', 'obra_id']
            isOneToOne: false
            referencedRelation: 'empresa'
            referencedColumns: ['id', 'obra_id']
          },
          {
            foreignKeyName: 'usuario_obra_obra_id_fkey'
            columns: ['obra_id']
            isOneToOne: false
            referencedRelation: 'obra'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usuario_obra_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuario'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adicionar_unidades: { Args: { p_quantidade: number; p_tipo: string }; Returns: string[] }
      listar_acessos: {
        Args: { p_obra: string }
        Returns: {
          desde: string
          email: string
          empresa_id: string
          empresa_nome: string
          nome: string
          perfil: Database['public']['Enums']['perfil']
          usuario_id: string
        }[]
      }
      registrar_devolucao: {
        Args: {
          p_itens: Json
          p_obra: string
          p_pessoa: string
          p_via: Database['public']['Enums']['via_movimento']
        }
        Returns: string
      }
      registrar_ocorrencia: { Args: { p_obra: string; p_pessoa: string }; Returns: string }
      registrar_retirada: {
        Args: {
          p_confirmado: boolean
          p_itens: Json
          p_obra: string
          p_pessoa: string
          p_via: Database['public']['Enums']['via_movimento']
        }
        Returns: string
      }
    }
    Enums: {
      linguagem_impressora: 'ZPL' | 'TSPL'
      motivo_avaria: 'quebrada' | 'cabo_rompido' | 'nao_liga' | 'desgaste' | 'peca_faltando'
      perfil: 'engenheiro' | 'almoxarife' | 'consulta'
      status_aviso: 'enviado' | 'cancelado' | 'confirmado'
      status_impressao: 'pendente' | 'enviado' | 'erro'
      status_unidade: 'livre' | 'em_uso' | 'manutencao' | 'baixada'
      tipo_empresa: 'propria' | 'empreiteira'
      tipo_movimento: 'retirada' | 'devolucao' | 'estorno'
      tipo_ocorrencia: 'capacete_trocado'
      via_movimento: 'qr' | 'manual'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      linguagem_impressora: ['ZPL', 'TSPL'],
      motivo_avaria: ['quebrada', 'cabo_rompido', 'nao_liga', 'desgaste', 'peca_faltando'],
      perfil: ['engenheiro', 'almoxarife', 'consulta'],
      status_aviso: ['enviado', 'cancelado', 'confirmado'],
      status_impressao: ['pendente', 'enviado', 'erro'],
      status_unidade: ['livre', 'em_uso', 'manutencao', 'baixada'],
      tipo_empresa: ['propria', 'empreiteira'],
      tipo_movimento: ['retirada', 'devolucao', 'estorno'],
      tipo_ocorrencia: ['capacete_trocado'],
      via_movimento: ['qr', 'manual'],
    },
  },
} as const
