export function getLoginErrorMessage(
  errorCode: string,
  providerMessage?: string,
): string {
  const messages: Record<string, string> = {
    "auth/invalid-email": "Please enter a valid email address.",
    "validation_failed": "Please enter a valid email address.",
    "auth/user-disabled":
      "This account has been disabled. Please contact SisterCare support.",
    "user_banned":
      "This account has been disabled. Please contact SisterCare support.",
    "auth/too-many-requests":
      "Too many sign-in attempts were made. Wait a few minutes before trying again.",
    "over_request_rate_limit":
      "Too many sign-in attempts were made. Wait a few minutes before trying again.",
    "auth/network-request-failed":
      "SisterCare could not reach the authentication service. Check your connection and retry.",
    "email_not_confirmed":
      "Your password may be correct, but this email has not been confirmed. Open the confirmation email, then sign in again.",
    "signup_disabled": "Account registration is currently disabled.",
    "weak_password":
      "This password no longer meets the security policy. Use password recovery to set a stronger password.",
  };
  if (messages[errorCode]) return messages[errorCode];
  if (
    [
      "auth/user-not-found",
      "auth/wrong-password",
      "auth/invalid-credential",
      "invalid_credentials",
    ].includes(errorCode)
  ) {
    return "Sign-in was rejected. Check the exact email and password, use Google if that is how the account was created, confirm the email if required, or reset the password.";
  }
  if (
    providerMessage &&
    providerMessage.length < 180 &&
    !/user not found|invalid login credentials|wrong password/i.test(
      providerMessage,
    )
  ) {
    return providerMessage;
  }
  return "Sign-in could not be completed. Check your details, try the correct sign-in method, or reset your password.";
}

export function getGoogleAuthErrorMessage(
  errorCode?: string,
  providerMessage?: string,
): string {
  if (errorCode === "over_request_rate_limit" || errorCode === "429") {
    return "Google sign-in is receiving too many requests. Wait a moment, then try again.";
  }
  if (
    errorCode === "provider_disabled" ||
    errorCode === "oauth_provider_not_supported" ||
    /provider.*(disabled|not enabled|unsupported)/i.test(providerMessage || "")
  ) {
    return "Google sign-in is not enabled for this SisterCare deployment. An administrator must enable the Google provider in Supabase.";
  }
  if (/network|fetch|offline/i.test(providerMessage || "")) {
    return "SisterCare could not reach Google. Check your connection and try again.";
  }
  if (
    providerMessage &&
    providerMessage.length < 180 &&
    !/token|secret|credential|client[_ -]?id/i.test(providerMessage)
  ) {
    return providerMessage;
  }
  return "Google sign-in could not be completed. Please try again or use email and password.";
}
