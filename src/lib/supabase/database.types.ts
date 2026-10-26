// Типи схеми бази. Оновлюйте разом із міграцією: готовий файл — у Summary прогону job db-check у CI
// (supabase gen types typescript --local на одноразовій базі); або npm run db:types після npx supabase link на ваш проєкт. Ця стартова версія написана вручну
// й описує таблиці й функції з міграцій 20261012000000, 20261022040716, 20261022042804 і 20261022063605.

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
          role: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          created_at: string;
          client_type: string;
          date_of_birth: string | null;
          session_language: string | null;
          guardian_name: string | null;
          guardian_email: string | null;
        };
        Insert: {
          id?: string;
          full_name: string;
          email?: string | null;
          created_at?: string;
          client_type?: string;
          date_of_birth?: string | null;
          session_language?: string | null;
          guardian_name?: string | null;
          guardian_email?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string | null;
          created_at?: string;
          client_type?: string;
          date_of_birth?: string | null;
          session_language?: string | null;
          guardian_name?: string | null;
          guardian_email?: string | null;
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
        Relationships: [
          {
            foreignKeyName: "holds_slot_id_fkey";
            columns: ["slot_id"];
            isOneToOne: false;
            referencedRelation: "slots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holds_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      confirm_hold: {
        Args: { p_hold_id: string };
        Returns: {
          id: string;
          slot_id: string;
          client_id: string;
          created_at: string;
          expires_at: string;
          confirmed_at: string | null;
        };
      };
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
