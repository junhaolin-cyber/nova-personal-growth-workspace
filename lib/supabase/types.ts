export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          timezone: string;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      devices: {
        Row: {
          id: string;
          user_id: string;
          device_name: string;
          device_type: string;
          platform: string;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_name: string;
          device_type?: string;
          platform?: string;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_name?: string;
          device_type?: string;
          platform?: string;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_data_items: {
        Row: {
          id: string;
          user_id: string;
          module: string;
          item_type: string;
          entity_id: string;
          state: string;
          payload: Json;
          source_storage_key: string;
          source_device_id: string | null;
          version: number;
          client_updated_at: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          module: string;
          item_type: string;
          entity_id: string;
          state: string;
          payload?: Json;
          source_storage_key: string;
          source_device_id?: string | null;
          version?: number;
          client_updated_at?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          module?: string;
          item_type?: string;
          entity_id?: string;
          state?: string;
          payload?: Json;
          source_storage_key?: string;
          source_device_id?: string | null;
          version?: number;
          client_updated_at?: string;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_migration_runs: {
        Row: {
          id: string;
          user_id: string;
          migration_key: string;
          source_device_id: string | null;
          status: string;
          item_count: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          migration_key: string;
          source_device_id?: string | null;
          status?: string;
          item_count?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          migration_key?: string;
          source_device_id?: string | null;
          status?: string;
          item_count?: number;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
