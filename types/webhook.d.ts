export interface DropboxWebhookPayload {
  delta: {
    users: number[];
  };
  list_folder: {
    accounts: string[];
  };
}
