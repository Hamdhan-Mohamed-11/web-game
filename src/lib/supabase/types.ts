// Hand-authored to match supabase/migrations/*.sql. Replace with
// `supabase gen types typescript` output once the project is live, then this
// file becomes generated rather than hand-maintained.
//
// Every table needs `Relationships: []` even though we declare no foreign
// keys here — supabase-js's GenericTable constraint requires the field to
// be present at all, and omitting it silently collapses every query's
// inferred type to `never` instead of raising a clear error at this file.

export interface Database {
  public: {
    Tables: {
      games: {
        Row: { slug: string; display_name: string; is_unlocked: boolean };
        Insert: { slug: string; display_name: string; is_unlocked?: boolean };
        Update: Partial<{ slug: string; display_name: string; is_unlocked: boolean }>;
        Relationships: [];
      };
      rounds: {
        Row: {
          id: string;
          game_slug: string;
          round_key: string;
          order_index: number;
          total_questions: number;
          status: "pending" | "active" | "closed" | "confirmed";
          started_at: string | null;
        };
        Insert: Partial<RoundsRow> & Pick<RoundsRow, "game_slug" | "round_key" | "order_index" | "total_questions">;
        Update: Partial<RoundsRow>;
        Relationships: [];
      };
      question_state: {
        Row: {
          id: string;
          round_id: string;
          question_index: number;
          started_at: string | null;
          closed_at: string | null;
        };
        Insert: Partial<QuestionStateRow> & Pick<QuestionStateRow, "round_id" | "question_index">;
        Update: Partial<QuestionStateRow>;
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          game_slug: string;
          display_name: string;
          joined_at: string;
          is_active: boolean;
        };
        Insert: Partial<ParticipantsRow> & Pick<ParticipantsRow, "game_slug" | "display_name">;
        Update: Partial<ParticipantsRow>;
        Relationships: [];
      };
      leaderboard_entries: {
        Row: {
          round_id: string;
          participant_id: string;
          display_name: string;
          total_points: number;
          total_elapsed_ms: number;
          progress: number;
          is_finished: boolean;
          score_reached_at: string | null;
          updated_at: string;
        };
        Insert: Partial<LeaderboardEntriesRow> &
          Pick<LeaderboardEntriesRow, "round_id" | "participant_id" | "display_name">;
        Update: Partial<LeaderboardEntriesRow>;
        Relationships: [];
      };
      round_results: {
        Row: { round_id: string; confirmed_at: string; winners: unknown };
        Insert: { round_id: string; confirmed_at?: string; winners: unknown };
        Update: Partial<RoundResultsRow>;
        Relationships: [];
      };
      book_match_sessions: {
        Row: {
          id: string;
          round_id: string;
          participant_id: string;
          started_at: string | null;
          ends_at: string | null;
          completed_at: string | null;
          correct_matches_count: number;
          total_points: number;
          is_finished: boolean;
        };
        Insert: Partial<BookMatchSessionsRow> & Pick<BookMatchSessionsRow, "round_id" | "participant_id">;
        Update: Partial<BookMatchSessionsRow>;
        Relationships: [];
      };
    };
    Views: {
      book_match_progress: {
        Row: { book_match_session_id: string; item_key: string };
        Relationships: [];
      };
    };
    Functions: {
      join_game: {
        Args: { p_game_slug: string; p_display_name: string };
        Returns: string; // participant uuid
      };
      start_question: {
        Args: { p_round_id: string; p_question_index: number };
        Returns: undefined;
      };
      submit_lockstep_answer: {
        Args: {
          p_question_state_id: string;
          p_participant_id: string;
          p_selected_choice_index: number;
        };
        Returns: undefined;
      };
      start_round: {
        Args: { p_round_id: string };
        Returns: undefined;
      };
      bookmatch_check_in: {
        Args: { p_round_id: string; p_participant_id: string };
        Returns: { id: string; started_at: string; ends_at: string }[];
      };
      bookmatch_submit_match: {
        Args: { p_session_id: string; p_item_key: string; p_selected_key: string };
        Returns: {
          is_correct: boolean;
          is_finished: boolean;
          correct_matches_count: number;
          total_points: number;
        }[];
      };
      confirm_round: {
        Args: { p_round_id: string; p_winners: unknown };
        Returns: undefined;
      };
      reset_game: {
        Args: { p_game_slug: string };
        Returns: undefined;
      };
      question_answer_stats: {
        Args: { p_question_state_id: string };
        Returns: { answered_count: number; participant_count: number }[];
      };
      set_active_game: {
        Args: { p_game_slug: string | null };
        Returns: undefined;
      };
      server_now: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
}

type RoundsRow = Database["public"]["Tables"]["rounds"]["Row"];
type QuestionStateRow = Database["public"]["Tables"]["question_state"]["Row"];
type ParticipantsRow = Database["public"]["Tables"]["participants"]["Row"];
type LeaderboardEntriesRow = Database["public"]["Tables"]["leaderboard_entries"]["Row"];
type RoundResultsRow = Database["public"]["Tables"]["round_results"]["Row"];
type BookMatchSessionsRow = Database["public"]["Tables"]["book_match_sessions"]["Row"];
