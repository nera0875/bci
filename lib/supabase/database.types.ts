export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Functions: {
      accept_project_invitation: {
        Args: { invitation_token: string }
        Returns: Json
      }
      get_user_emails: {
        Args: { user_ids: string[] }
        Returns: { email: string; id: string }[]
      }
      get_user_invitations: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          inviter_email: string
          project_id: string
          project_name: string
          role: string
          token: string
        }[]
      }
      remove_project_member: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_expired_invitations: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      [key: string]: any
    }
  }
}
