export const DISCREET_NOTIFICATION_TITLE = "SisterCare";
export const DISCREET_NOTIFICATION_BODY =
  "You have a private update. Open SisterCare to view it.";

export interface NotificationPrivacyOptions {
  allowSensitivePreview?: boolean;
}

export function buildSystemNotificationContent(
  title: string,
  body?: string,
  options: NotificationPrivacyOptions = {},
): { title: string; body: string } {
  if (options.allowSensitivePreview === true) {
    return {
      title: title.trim() || DISCREET_NOTIFICATION_TITLE,
      body: body?.trim() || DISCREET_NOTIFICATION_BODY,
    };
  }

  return {
    title: DISCREET_NOTIFICATION_TITLE,
    body: DISCREET_NOTIFICATION_BODY,
  };
}
