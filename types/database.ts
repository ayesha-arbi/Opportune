export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OpportunityType =
  | "hackathon"
  | "fellowship"
  | "competition"
  | "research"
  | "grant"
  | "other";

export type TrackerStatus =
  | "saved"
  | "applied"
  | "submitted"
  | "accepted"
  | "rejected";

export type ChatRole = "user" | "assistant" | "tool";

/** Shape of the `eligibility` jsonb column on opportunities. */
export type Eligibility = {
  edu_level?: string[];
  region?: string[];
  age_max?: number;
  [key: string]: Json | undefined;
}

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  education_level: string | null;
  field_of_study: string | null;
  university: string | null;
  interests: string[];
  skills: string[];
  goals: string[];
  goal_type: string | null;
  location: string | null;
  remote_preference: boolean | null;
  bio: string | null;
  dream_opportunity: string | null;
  biggest_challenge: string | null;
  fun_fact: string | null;
  created_at: string;
  updated_at: string;
}

export type Opportunity = {
  id: string;
  title: string;
  description: string | null;
  type: OpportunityType;
  field_tags: string[];
  eligibility: Eligibility | null;
  organizer: string | null;
  location: string | null;
  is_remote: boolean | null;
  deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  prize_info: string | null;
  source_url: string;
  source_name: string | null;
  application_url: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export type UserOpportunity = {
  id: string;
  user_id: string;
  opportunity_id: string;
  status: TrackerStatus;
  notes: string | null;
  reminder_sent: boolean | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

/** user_opportunities row joined with its opportunity (tracker API responses). */
export interface UserOpportunityWithOpportunity extends UserOpportunity {
  opportunity: Opportunity | null;
}

export type ChatMessage = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  role: ChatRole;
  content: string | null;
  tool_calls: Json | null;
  created_at: string;
}

/**
 * Hand-written Database types matching supabase/migrations/001_init.sql.
 * When the schema changes, update this file (or regenerate with
 * `supabase gen types typescript` once a live project exists).
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      opportunities: {
        Row: Opportunity;
        Insert: Partial<Opportunity>;
        Update: Partial<Opportunity>;
        Relationships: [];
      };
      user_opportunities: {
        Row: UserOpportunity;
        Insert: Partial<UserOpportunity>;
        Update: Partial<UserOpportunity>;
        Relationships: [
          {
            foreignKeyName: "user_opportunities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_opportunities_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Partial<ChatMessage>;
        Update: Partial<ChatMessage>;
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
