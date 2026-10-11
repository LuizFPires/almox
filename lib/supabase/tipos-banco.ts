// Gerado por `npm run gen:types` a partir do schema local. Não edite à mão.
// Placeholder do M0: o schema real chega no M1.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<never, never>
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
