export type CareNotificationType =
  | "session_assigned"
  | "session_accepted"
  | "session_rematching"
  | "session_cancelled"
  | "session_completed"
  | "session_escalated"
  | "session_message"
  | "follow_up_requested"
  | "follow_up_started"
  | "safety_alert"
  | "doctor_request"
  | "doctor_status"
  | "doctor_message"
  | "prescription_issued"
  | "medical_safety_block";

const CONTENT: Record<CareNotificationType, { title: string; message: string }> = {
  session_assigned: { title: "New care request", message: "A private care request has been assigned to you." },
  session_accepted: { title: "Your counsellor is ready", message: "Your counsellor accepted the request. Open your private room to talk." },
  session_rematching: { title: "Counsellor request update", message: "The previous counsellor could not take the request. SisterCare is finding another available counsellor." },
  session_cancelled: { title: "Care request cancelled", message: "The member cancelled this care request." },
  session_completed: { title: "Private session completed", message: "Your care room has closed. You can choose a private follow-up if you need one." },
  session_escalated: { title: "Support escalation recorded", message: "Your counsellor requested additional support. SisterCare is keeping the case visible to the safety team." },
  session_message: { title: "New private message", message: "A new message is waiting in your private care room." },
  follow_up_requested: { title: "Follow-up needs attention", message: "A member follow-up is assigned to you in the professional care workspace." },
  follow_up_started: { title: "Your follow-up is ready", message: "Your counsellor opened a private follow-up room for you." },
  safety_alert: { title: "Critical safety alert", message: "A serious case needs immediate professional attention. Open the secure response workspace now." },
  doctor_request: { title: "New medical request", message: "A member is waiting for your response in the private clinical workspace." },
  doctor_status: { title: "Doctor request updated", message: "Your verified doctor request has a new status." },
  doctor_message: { title: "New private medical message", message: "A new message is waiting in your private doctor consultation." },
  prescription_issued: { title: "Prescription available", message: "Your doctor issued a prescription after the consultation. Review it carefully in SisterCare." },
  medical_safety_block: { title: "AI medical safety block", message: "SisterCare blocked a prohibited medical instruction. Review the safety incident and model behavior." },
};

export function describeCareNotification(type: CareNotificationType) {
  return CONTENT[type];
}
