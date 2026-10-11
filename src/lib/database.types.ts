
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "candidate_education": {
                  Row: {
                    "candidate_id": string,"degree": string | null,"field": string | null,"graduation_year": number | null,"id": number,"school": string | null
                  }
                  Insert: {
                    "candidate_id": string,"degree"?: string | null,"field"?: string | null,"graduation_year"?: number | null,"id"?: never,"school"?: string | null
                  }
                  Update: {
                    "candidate_id"?: string,"degree"?: string | null,"field"?: string | null,"graduation_year"?: number | null,"id"?: never,"school"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_education_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_experiences": {
                  Row: {
                    "candidate_id": string,"company": string | null,"company_logo_url": string | null,"company_type": string | null,"description": string | null,"end_year": number | null,"id": number,"start_year": number | null,"title": string | null
                  }
                  Insert: {
                    "candidate_id": string,"company"?: string | null,"company_logo_url"?: string | null,"company_type"?: string | null,"description"?: string | null,"end_year"?: number | null,"id"?: never,"start_year"?: number | null,"title"?: string | null
                  }
                  Update: {
                    "candidate_id"?: string,"company"?: string | null,"company_logo_url"?: string | null,"company_type"?: string | null,"description"?: string | null,"end_year"?: number | null,"id"?: never,"start_year"?: number | null,"title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_experiences_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"candidates": {
                  Row: {
                    "avatar_url": string | null,"city": string | null,"country": string | null,"current_company": string | null,"current_company_logo_url": string | null,"current_title": string | null,"full_name": string,"headline": string | null,"id": string,"open_to_work": boolean,"role": string | null,"seniority": string | null,"skills": (string)[],"state": string | null,"years_experience": number | null
                  }
                  Insert: {
                    "avatar_url"?: string | null,"city"?: string | null,"country"?: string | null,"current_company"?: string | null,"current_company_logo_url"?: string | null,"current_title"?: string | null,"full_name": string,"headline"?: string | null,"id": string,"open_to_work": boolean,"role"?: string | null,"seniority"?: string | null,"skills": (string)[],"state"?: string | null,"years_experience"?: number | null
                  }
                  Update: {
                    "avatar_url"?: string | null,"city"?: string | null,"country"?: string | null,"current_company"?: string | null,"current_company_logo_url"?: string | null,"current_title"?: string | null,"full_name"?: string,"headline"?: string | null,"id"?: string,"open_to_work"?: boolean,"role"?: string | null,"seniority"?: string | null,"skills"?: (string)[],"state"?: string | null,"years_experience"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"companies": {
                  Row: {
                    "id": string,"name": string,"slug": string
                  }
                  Insert: {
                    "id"?: string,"name": string,"slug": string
                  }
                  Update: {
                    "id"?: string,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"company_plans": {
                  Row: {
                    "company_id": string,"last_event_created": number,"last_event_id": string | null,"plan": string,"searches_used": number,"stripe_subscription_id": string | null
                  }
                  Insert: {
                    "company_id": string,"last_event_created"?: number,"last_event_id"?: string | null,"plan"?: string,"searches_used"?: number,"stripe_subscription_id"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"last_event_created"?: number,"last_event_id"?: string | null,"plan"?: string,"searches_used"?: number,"stripe_subscription_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_plans_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"recruiters": {
                  Row: {
                    "company_id": string,"id": string
                  }
                  Insert: {
                    "company_id": string,"id": string
                  }
                  Update: {
                    "company_id"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recruiters_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_briefs": {
                  Row: {
                    "brief": string,"company_id": string,"created_at": string,"filters": NonNullable<Json>,"id": string,"search_id": string | null
                  }
                  Insert: {
                    "brief": string,"company_id": string,"created_at"?: string,"filters"?: NonNullable<Json>,"id"?: string,"search_id"?: string | null
                  }
                  Update: {
                    "brief"?: string,"company_id"?: string,"created_at"?: string,"filters"?: NonNullable<Json>,"id"?: string,"search_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_briefs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },
                    {
      foreignKeyName: "saved_briefs_search_id_fkey"
      columns: ["search_id"]
isOneToOne: false
      referencedRelation: "searches"
      referencedColumns: ["id"]
    }
                  ]
                },"search_results": {
                  Row: {
                    "candidate_id": string,"position": number,"search_id": string
                  }
                  Insert: {
                    "candidate_id": string,"position": number,"search_id": string
                  }
                  Update: {
                    "candidate_id"?: string,"position"?: number,"search_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "search_results_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "search_results_search_id_fkey"
      columns: ["search_id"]
isOneToOne: false
      referencedRelation: "searches"
      referencedColumns: ["id"]
    }
                  ]
                },"searches": {
                  Row: {
                    "brief": string | null,"company_id": string,"created_at": string,"filters": NonNullable<Json>,"id": string,"recruiter_id": string,"total": number
                  }
                  Insert: {
                    "brief"?: string | null,"company_id": string,"created_at"?: string,"filters"?: NonNullable<Json>,"id"?: string,"recruiter_id": string,"total"?: number
                  }
                  Update: {
                    "brief"?: string | null,"company_id"?: string,"created_at"?: string,"filters"?: NonNullable<Json>,"id"?: string,"recruiter_id"?: string,"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "searches_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "searches_recruiter_id_fkey"
      columns: ["recruiter_id"]
isOneToOne: false
      referencedRelation: "recruiters"
      referencedColumns: ["id"]
    }
                  ]
                },"shortlist_people": {
                  Row: {
                    "added_at": string,"candidate_id": string,"shortlist_id": string
                  }
                  Insert: {
                    "added_at"?: string,"candidate_id": string,"shortlist_id": string
                  }
                  Update: {
                    "added_at"?: string,"candidate_id"?: string,"shortlist_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shortlist_people_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shortlist_people_shortlist_id_fkey"
      columns: ["shortlist_id"]
isOneToOne: false
      referencedRelation: "shortlists"
      referencedColumns: ["id"]
    }
                  ]
                },"shortlists": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"name": string,"recruiter_id": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"name": string,"recruiter_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"name"?: string,"recruiter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shortlists_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shortlists_recruiter_id_fkey"
      columns: ["recruiter_id"]
isOneToOne: false
      referencedRelation: "recruiters"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_events": {
                  Row: {
                    "company_id": string,"event_created": number,"id": string,"processed_at": string,"subscription_id": string | null,"type": string
                  }
                  Insert: {
                    "company_id": string,"event_created": number,"id": string,"processed_at"?: string,"subscription_id"?: string | null,"type": string
                  }
                  Update: {
                    "company_id"?: string,"event_created"?: number,"id"?: string,"processed_at"?: string,"subscription_id"?: string | null,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stripe_events_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "apply_stripe_event":
{ Args: { "company_slug": string,"event_created": number,"event_id": string,"status": string,"subscription_id": string,"type": string }; Returns: string
                           },
"create_search":
{ Args: { "p_brief": string,"p_filters": Json }; Returns: {
              "plan": string,"search_id": string,"searches_used": number,"total": number
            }[]
                           },
"match_candidates":
{ Args: { "filters": Json }; Returns: {
              "id": string,"score": number
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
