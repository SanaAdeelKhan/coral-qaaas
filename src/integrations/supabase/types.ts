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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_registrations: {
        Row: {
          agent_id: string
          coral_response: Json | null
          coral_server_url: string
          created_at: string
          id: string
          registered_at: string | null
          registration_status: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          coral_response?: Json | null
          coral_server_url: string
          created_at?: string
          id?: string
          registered_at?: string | null
          registration_status?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          coral_response?: Json | null
          coral_server_url?: string
          created_at?: string
          id?: string
          registered_at?: string | null
          registration_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_registrations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          capabilities: Json | null
          coral_agent_id: string | null
          created_at: string
          endpoint_url: string
          id: string
          metadata: Json | null
          name: string
          status: string | null
          type: string
          updated_at: string
        }
        Insert: {
          capabilities?: Json | null
          coral_agent_id?: string | null
          created_at?: string
          endpoint_url: string
          id?: string
          metadata?: Json | null
          name: string
          status?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          capabilities?: Json | null
          coral_agent_id?: string | null
          created_at?: string
          endpoint_url?: string
          id?: string
          metadata?: Json | null
          name?: string
          status?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      repositories: {
        Row: {
          branch: string | null
          clone_url: string | null
          created_at: string
          github_url: string
          id: string
          metadata: Json | null
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          branch?: string | null
          clone_url?: string | null
          created_at?: string
          github_url: string
          id?: string
          metadata?: Json | null
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          branch?: string | null
          clone_url?: string | null
          created_at?: string
          github_url?: string
          id?: string
          metadata?: Json | null
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      test_results: {
        Row: {
          agent_id: string
          agent_type: string
          completed_at: string | null
          created_at: string
          execution_time_ms: number | null
          id: string
          logs: string | null
          result_data: Json | null
          started_at: string | null
          status: string | null
          test_run_id: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          agent_type: string
          completed_at?: string | null
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          logs?: string | null
          result_data?: Json | null
          started_at?: string | null
          status?: string | null
          test_run_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          agent_type?: string
          completed_at?: string | null
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          logs?: string | null
          result_data?: Json | null
          started_at?: string | null
          status?: string | null
          test_run_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_runs: {
        Row: {
          arweave_hash: string | null
          completed_agents: number | null
          completed_at: string | null
          coral_transaction_id: string | null
          created_at: string
          id: string
          ipfs_hash: string | null
          metadata: Json | null
          repository_id: string
          solana_transaction_id: string | null
          started_at: string | null
          status: string | null
          total_agents: number | null
          updated_at: string
        }
        Insert: {
          arweave_hash?: string | null
          completed_agents?: number | null
          completed_at?: string | null
          coral_transaction_id?: string | null
          created_at?: string
          id?: string
          ipfs_hash?: string | null
          metadata?: Json | null
          repository_id: string
          solana_transaction_id?: string | null
          started_at?: string | null
          status?: string | null
          total_agents?: number | null
          updated_at?: string
        }
        Update: {
          arweave_hash?: string | null
          completed_agents?: number | null
          completed_at?: string | null
          coral_transaction_id?: string | null
          created_at?: string
          id?: string
          ipfs_hash?: string | null
          metadata?: Json | null
          repository_id?: string
          solana_transaction_id?: string | null
          started_at?: string | null
          status?: string | null
          total_agents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_runs_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
