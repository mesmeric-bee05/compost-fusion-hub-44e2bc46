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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json
          target_count: number
          target_emails: string[]
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_count?: number
          target_emails?: string[]
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_count?: number
          target_emails?: string[]
        }
        Relationships: []
      }
      article_bookmarks: {
        Row: {
          content_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_bookmarks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      article_comments: {
        Row: {
          body: string
          content_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          content_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          content_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          points_reward: number
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          points_reward?: number
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          points_reward?: number
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          bundle_id: string
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          bundle_id?: string
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "product_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_requests: {
        Row: {
          address: string
          created_at: string
          driver_id: string | null
          estimated_volume_kg: number | null
          frequency: Database["public"]["Enums"]["schedule_frequency"]
          id: string
          notes: string | null
          pickup_date: string
          pickup_time: string | null
          status: Database["public"]["Enums"]["collection_status"]
          updated_at: string
          user_id: string
          verification_photo_url: string | null
          waste_type: Database["public"]["Enums"]["waste_type"]
        }
        Insert: {
          address: string
          created_at?: string
          driver_id?: string | null
          estimated_volume_kg?: number | null
          frequency?: Database["public"]["Enums"]["schedule_frequency"]
          id?: string
          notes?: string | null
          pickup_date: string
          pickup_time?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
          updated_at?: string
          user_id: string
          verification_photo_url?: string | null
          waste_type?: Database["public"]["Enums"]["waste_type"]
        }
        Update: {
          address?: string
          created_at?: string
          driver_id?: string | null
          estimated_volume_kg?: number | null
          frequency?: Database["public"]["Enums"]["schedule_frequency"]
          id?: string
          notes?: string | null
          pickup_date?: string
          pickup_time?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
          updated_at?: string
          user_id?: string
          verification_photo_url?: string | null
          waste_type?: Database["public"]["Enums"]["waste_type"]
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          county: string | null
          created_at: string | null
          email: string | null
          id: string
          interest: string | null
          is_read: boolean | null
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          county?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          interest?: string | null
          is_read?: boolean | null
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          county?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          interest?: string | null
          is_read?: boolean | null
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      content: {
        Row: {
          author_id: string | null
          body: string | null
          category: string
          content_type: string
          created_at: string
          id: string
          image_url: string | null
          is_published: boolean
          language: string
          slug: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          category?: string
          content_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          language?: string
          slug: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          category?: string
          content_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          language?: string
          slug?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          times_used: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          times_used?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          times_used?: number
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      impact_metrics: {
        Row: {
          co2_saved_kg: number
          compost_produced_kg: number
          id: string
          recorded_at: string
          trees_equivalent: number
          user_id: string
          waste_diverted_kg: number
        }
        Insert: {
          co2_saved_kg?: number
          compost_produced_kg?: number
          id?: string
          recorded_at?: string
          trees_equivalent?: number
          user_id: string
          waste_diverted_kg?: number
        }
        Update: {
          co2_saved_kg?: number
          compost_produced_kg?: number
          id?: string
          recorded_at?: string
          trees_equivalent?: number
          user_id?: string
          waste_diverted_kg?: number
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          browser_collection_reminders: boolean
          browser_order_updates: boolean
          browser_reward_achievements: boolean
          created_at: string
          email_collection_reminders: boolean
          email_order_updates: boolean
          email_reward_achievements: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          browser_collection_reminders?: boolean
          browser_order_updates?: boolean
          browser_reward_achievements?: boolean
          created_at?: string
          email_collection_reminders?: boolean
          email_order_updates?: boolean
          email_reward_achievements?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          browser_collection_reminders?: boolean
          browser_order_updates?: boolean
          browser_reward_achievements?: boolean
          created_at?: string
          email_collection_reminders?: boolean
          email_order_updates?: boolean
          email_reward_achievements?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_email_log: {
        Row: {
          id: string
          order_id: string
          resend_id: string | null
          sent_at: string
          status: string
        }
        Insert: {
          id?: string
          order_id: string
          resend_id?: string | null
          sent_at?: string
          status: string
        }
        Update: {
          id?: string
          order_id?: string
          resend_id?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          delivery_address: string | null
          delivery_phone: string | null
          discount_amount: number | null
          driver_id: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_phone?: string | null
          discount_amount?: number | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_phone?: string | null
          discount_amount?: number | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_email_resend_attempts: {
        Row: {
          admin_id: string
          attempted_at: string
          id: string
          order_id: string
          status: string
        }
        Insert: {
          admin_id: string
          attempted_at?: string
          id?: string
          order_id: string
          status: string
        }
        Update: {
          admin_id?: string
          attempted_at?: string
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          callback_token: string | null
          created_at: string
          id: string
          mpesa_checkout_request_id: string | null
          mpesa_merchant_request_id: string | null
          mpesa_receipt_number: string | null
          order_id: string
          phone_number: string
          result_code: number | null
          result_description: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          callback_token?: string | null
          created_at?: string
          id?: string
          mpesa_checkout_request_id?: string | null
          mpesa_merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          order_id: string
          phone_number: string
          result_code?: number | null
          result_description?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          callback_token?: string | null
          created_at?: string
          id?: string
          mpesa_checkout_request_id?: string | null
          mpesa_merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          order_id?: string
          phone_number?: string
          result_code?: number | null
          result_description?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bundles: {
        Row: {
          created_at: string
          description: string | null
          discount_percent: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          image_url: string | null
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bulk_discount_percent: number | null
          category: string
          created_at: string
          currency: string
          description: string | null
          gallery: string[] | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          short_description: string | null
          slug: string
          specifications: Json | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          bulk_discount_percent?: number | null
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          gallery?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          short_description?: string | null
          slug: string
          specifications?: Json | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          bulk_discount_percent?: number | null
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          gallery?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          short_description?: string | null
          slug?: string
          specifications?: Json | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          language: string
          location: string | null
          onboarding_completed: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          language?: string
          location?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          language?: string
          location?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          badges: string[] | null
          id: string
          level: string
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badges?: string[] | null
          id?: string
          level?: string
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badges?: string[] | null
          id?: string
          level?: string
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      ussd_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          menu_state: string | null
          phone_number: string
          session_data: Json | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          menu_state?: string | null
          phone_number: string
          session_data?: Json | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          menu_state?: string | null
          phone_number?: string
          session_data?: Json | null
          session_id?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      payments_safe: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string | null
          mpesa_checkout_request_id: string | null
          mpesa_receipt_number: string | null
          order_id: string | null
          phone_number: string | null
          result_code: number | null
          result_description: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string | null
          mpesa_checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          order_id?: string | null
          phone_number?: string | null
          result_code?: number | null
          result_description?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string | null
          mpesa_checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          order_id?: string | null
          phone_number?: string | null
          result_code?: number | null
          result_description?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_coupon: {
        Args: { _code: string; _order_total: number }
        Returns: Json
      }
      check_email_resend_rate: {
        Args: { _order: string; _status: string }
        Returns: Json
      }
      create_order: {
        Args: {
          _coupon_code?: string
          _delivery_address: string
          _delivery_phone: string
          _items: Json
          _notes?: string
        }
        Returns: Json
      }
      get_audit_admin_names: {
        Args: { user_ids: string[] }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      get_leaderboard_badge_counts: {
        Args: { _user_ids: string[] }
        Returns: {
          badge_count: number
          user_id: string
        }[]
      }
      get_leaderboard_profiles: {
        Args: { user_ids: string[] }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      get_public_profiles: {
        Args: { _user_ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          user_id: string
        }[]
      }
      get_ussd_session_detail: {
        Args: { _session_id: string }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          menu_state: string
          phone_number: string
          session_data: Json
          session_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          _action: string
          _admin_id: string
          _emails: string[]
          _metadata?: Json
        }
        Returns: string
      }
      search_audit_log: {
        Args: {
          _action?: string
          _email_query?: string
          _emails?: string[]
          _from?: string
          _limit?: number
          _mode?: string
          _offset?: number
          _to?: string
        }
        Returns: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json
          target_count: number
          target_emails: string[]
          total_count: number
        }[]
      }
      search_ussd_sessions: {
        Args: {
          _active?: boolean
          _limit?: number
          _offset?: number
          _q?: string
          _state?: string
        }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          menu_state: string
          phone_number: string
          session_data: Json
          session_id: string
          total_count: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "individual"
        | "farmer"
        | "institution"
        | "recycler"
        | "driver"
        | "admin"
      collection_status: "requested" | "scheduled" | "collected" | "cancelled"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
      schedule_frequency: "one_time" | "weekly" | "biweekly" | "monthly"
      waste_type: "organic" | "recyclable" | "agricultural" | "mixed"
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
    Enums: {
      app_role: [
        "individual",
        "farmer",
        "institution",
        "recycler",
        "driver",
        "admin",
      ],
      collection_status: ["requested", "scheduled", "collected", "cancelled"],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      schedule_frequency: ["one_time", "weekly", "biweekly", "monthly"],
      waste_type: ["organic", "recyclable", "agricultural", "mixed"],
    },
  },
} as const
