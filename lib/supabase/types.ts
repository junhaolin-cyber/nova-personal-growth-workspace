export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ThirdBatchBaseRow = {
  id: string;
  user_id: string;
  local_id: string;
  source_device_id: string | null;
  source_storage_key: string;
  version: number;
  client_created_at: string;
  client_updated_at: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type ThirdBatchTable<Row extends ThirdBatchBaseRow> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, "user_id" | "local_id" | "client_created_at" | "client_updated_at">;
  Update: Partial<Row>;
  Relationships: [];
};

type ThirdBatchTables = {
  english_learning_settings: ThirdBatchTable<ThirdBatchBaseRow & {
    daily_word_count: number;
    accent: string;
  }>;
  english_word_progress: ThirdBatchTable<ThirdBatchBaseRow & {
    word_id: string;
    status: string;
    first_learned_at: string | null;
    last_learned_at: string | null;
    next_review_at: string | null;
    review_count: number;
    correct_count: number;
    wrong_count: number;
    is_favorite: boolean;
    is_in_vocabulary_book: boolean;
  }>;
  english_daily_plans: ThirdBatchTable<ThirdBatchBaseRow & {
    plan_date: string;
    word_ids: Json;
    completed_word_ids: Json;
    reviewed_word_ids: Json;
    started_at: string | null;
    completed_at: string | null;
  }>;
  english_learning_records: ThirdBatchTable<ThirdBatchBaseRow & {
    record_date: string;
    learned_count: number;
    mastered_count: number;
    reviewed_count: number;
    correct_rate: number;
    duration_minutes: number;
    target_completed: boolean;
  }>;
  english_recommendation_states: ThirdBatchTable<ThirdBatchBaseRow & {
    recommendation_id: string;
    is_favorite: boolean;
    is_watched: boolean;
    last_shown_at: string | null;
  }>;
  speaking_settings: ThirdBatchTable<ThirdBatchBaseRow & {
    level: string;
    accent: string;
    response_speed: string;
    show_translation: boolean;
    auto_read: boolean;
    daily_goal_minutes: number;
    show_feedback: boolean;
  }>;
  speaking_sessions: ThirdBatchTable<ThirdBatchBaseRow & {
    session_date: string;
    started_at: string;
    ended_at: string;
    scenario_id: string;
    scenario_title: string;
    difficulty: string;
    turn_count: number;
    user_messages: Json;
    ai_messages: Json;
    feedback: Json;
    saved_expression_ids: Json;
    duration_seconds: number;
    summary_level: string;
    improvement: string;
  }>;
  speaking_expressions: ThirdBatchTable<ThirdBatchBaseRow & {
    expression: string;
    explanation: string;
    scenario_id: string;
    scenario_title: string;
    source_date: string;
    original_text: string;
    saved_at: string;
  }>;
  speaking_drafts: ThirdBatchTable<ThirdBatchBaseRow & {
    scenario_id: string;
    started_at: string;
    messages: Json;
    hint_level: number;
  }>;
};

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
      plan_tasks: {
        Row: {
          id: string;
          user_id: string;
          local_id: string;
          source_device_id: string | null;
          title: string;
          task_date: string;
          task_time: string | null;
          priority: string;
          category: string;
          notes: string;
          completed: boolean;
          completed_at: string | null;
          source_storage_key: string;
          version: number;
          client_created_at: string;
          client_updated_at: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          local_id: string;
          source_device_id?: string | null;
          title: string;
          task_date: string;
          task_time?: string | null;
          priority?: string;
          category?: string;
          notes?: string;
          completed?: boolean;
          completed_at?: string | null;
          source_storage_key?: string;
          version?: number;
          client_created_at: string;
          client_updated_at: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          local_id?: string;
          source_device_id?: string | null;
          title?: string;
          task_date?: string;
          task_time?: string | null;
          priority?: string;
          category?: string;
          notes?: string;
          completed?: boolean;
          completed_at?: string | null;
          source_storage_key?: string;
          version?: number;
          client_created_at?: string;
          client_updated_at?: string;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      exercise_types: {
        Row: {
          id: string;
          user_id: string;
          local_id: string;
          source_device_id: string | null;
          name: string;
          icon: string;
          sort_order: number;
          is_favorite: boolean;
          is_active: boolean;
          source_storage_key: string;
          version: number;
          client_created_at: string;
          client_updated_at: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          local_id: string;
          source_device_id?: string | null;
          name: string;
          icon?: string;
          sort_order?: number;
          is_favorite?: boolean;
          is_active?: boolean;
          source_storage_key?: string;
          version?: number;
          client_created_at: string;
          client_updated_at: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          local_id?: string;
          source_device_id?: string | null;
          name?: string;
          icon?: string;
          sort_order?: number;
          is_favorite?: boolean;
          is_active?: boolean;
          source_storage_key?: string;
          version?: number;
          client_created_at?: string;
          client_updated_at?: string;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      exercise_records: {
        Row: {
          id: string;
          user_id: string;
          local_id: string;
          source_device_id: string | null;
          type_local_id: string;
          exercise_date: string;
          start_time: string | null;
          duration_minutes: number | null;
          location: string | null;
          intensity: string | null;
          feeling: string | null;
          note: string | null;
          image_url: string | null;
          source_storage_key: string;
          version: number;
          client_created_at: string;
          client_updated_at: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          local_id: string;
          source_device_id?: string | null;
          type_local_id: string;
          exercise_date: string;
          start_time?: string | null;
          duration_minutes?: number | null;
          location?: string | null;
          intensity?: string | null;
          feeling?: string | null;
          note?: string | null;
          image_url?: string | null;
          source_storage_key?: string;
          version?: number;
          client_created_at: string;
          client_updated_at: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          local_id?: string;
          source_device_id?: string | null;
          type_local_id?: string;
          exercise_date?: string;
          start_time?: string | null;
          duration_minutes?: number | null;
          location?: string | null;
          intensity?: string | null;
          feeling?: string | null;
          note?: string | null;
          image_url?: string | null;
          source_storage_key?: string;
          version?: number;
          client_created_at?: string;
          client_updated_at?: string;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    } & ThirdBatchTables;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
