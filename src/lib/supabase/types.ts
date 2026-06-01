export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          nome: string
          empresa: string | null
          email: string | null
          telefone: string | null
          criado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          empresa?: string | null
          email?: string | null
          telefone?: string | null
          criado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          empresa?: string | null
          email?: string | null
          telefone?: string | null
          criado_por?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contatos: {
        Row: {
          id: string
          cliente_id: string
          nome: string
          cargo: string | null
          email: string | null
          telefone: string | null
          created_at: string
          criado_por: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          nome: string
          cargo?: string | null
          email?: string | null
          telefone?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          nome?: string
          cargo?: string | null
          email?: string | null
          telefone?: string | null
        }
      }
      notas: {
        Row: {
          id: string
          cliente_id: string
          texto: string
          criado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          texto: string
          criado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          texto?: string
          criado_por?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Cliente = Database['public']['Tables']['clientes']['Row']
export type ClienteInsert = Database['public']['Tables']['clientes']['Insert']
export type ClienteUpdate = Database['public']['Tables']['clientes']['Update']
export type Contato = Database['public']['Tables']['contatos']['Row']
export type ContatoInsert = Database['public']['Tables']['contatos']['Insert']
export type Nota = Database['public']['Tables']['notas']['Row']
export type NotaInsert = Database['public']['Tables']['notas']['Insert']
export type ContatoUpdate = Database['public']['Tables']['contatos']['Update']
export type NotaUpdate = Database['public']['Tables']['notas']['Update']
