// Типи схеми бази. Оновлюйте разом із міграцією: готовий файл — у Summary прогону job db-check у CI
// (supabase gen types typescript --local на одноразовій базі); або npm run db:types після npx supabase link на ваш проєкт. Ця стартова версія написана вручну
// й описує таблиці й функції з міграцій 20261012000000, 20261022040716 і 20261022042804.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      slots: {
        Row: {
          id: string;
          therapist_id: string;
          starts_at: string;
          ends_at: string;
        };
        Insert: {
          id?: string;
          therapist_id: string;
          starts_at: string;
          ends_at: string;
        };
        Update: {
          id?: string;
          therapist_id?: string;
          starts_at?: string;
          ends_at?: string;
        };
        Relationships: [];
      };
      holds: {
        Row: {
          id: string;
          slot_id: string;
          client_id: string;
          created_at: string;
          expires_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          slot_id: string;
          client_id: string;
          created_at: string;
          expires_at: string;
          confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          slot_id?: string;
          client_id?: string;
          created_at?: string;
          expires_at?: string;
          confirmed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      hold_slot: {
        Args: { p_slot_id: string; p_client_id: string };
        Returns: {
          id: string;
          slot_id: string;
          client_id: string;
          created_at: string;
          expires_at: string;
          confirmed_at: string | null;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
