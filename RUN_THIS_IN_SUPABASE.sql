-- ============================================================================
-- SISTERCARE DOCTOR TABLES - RUN IN SUPABASE SQL EDITOR
-- ============================================================================
-- This script creates all doctor-related tables and functions.
-- Copy this entire file and paste it into Supabase SQL Editor, then click RUN.
-- ============================================================================

-- MIGRATION 1: Add doctor role to enum
-- ============================================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'doctor';

-- MIGRATION 2: Create doctor tables and types
-- ============================================================================
CREATE TYPE public.doctor_status AS ENUM ('available', 'busy', 'offline');

CREATE TABLE public.doctors (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_name text NOT NULL CHECK (char_length(professional_name) BETWEEN 2 AND 100),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 100),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 1200),
  specializations text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT array['English'],
  registration_number text NOT NULL UNIQUE,
  licensing_body text NOT NULL,
  credential_expires_at date NOT NULL,
  profile_photo_path text,
  years_experience integer NOT NULL DEFAULT 0 CHECK (years_experience BETWEEN 0 AND 80),
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended', 'expired')),
  status public.doctor_status NOT NULL DEFAULT 'offline',
  accepting_appointments boolean NOT NULL DEFAULT false,
  last_heartbeat_at timestamptz,
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.doctor_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'booked', 'in_consultation', 'completed', 'declined', 'cancelled')),
  urgency text NOT NULL DEFAULT 'routine'
    CHECK (urgency IN ('routine', 'urgent', 'critical')),
  specialty text NOT NULL CHECK (char_length(specialty) BETWEEN 2 AND 100),
  member_summary text NOT NULL DEFAULT '' CHECK (char_length(member_summary) <= 500),
  preferred_language text NOT NULL DEFAULT 'English',
  scheduled_for timestamptz,
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  consultation_started_at timestamptz,
  completed_at timestamptz,
  cancellation_reason text CHECK (char_length(cancellation_reason) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.doctor_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.doctor_appointments(id) ON DELETE RESTRICT,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  medicine_name text NOT NULL CHECK (char_length(medicine_name) BETWEEN 2 AND 160),
  strength text NOT NULL CHECK (char_length(strength) BETWEEN 1 AND 80),
  dose text NOT NULL CHECK (char_length(dose) BETWEEN 1 AND 120),
  route text NOT NULL CHECK (char_length(route) BETWEEN 2 AND 80),
  frequency text NOT NULL CHECK (char_length(frequency) BETWEEN 2 AND 120),
  duration text NOT NULL CHECK (char_length(duration) BETWEEN 2 AND 120),
  quantity text NOT NULL CHECK (char_length(quantity) BETWEEN 1 AND 80),
  instructions text NOT NULL DEFAULT '' CHECK (char_length(instructions) <= 1000),
  clinical_attestation boolean NOT NULL CHECK (clinical_attestation),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'voided')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  void_reason text CHECK (char_length(void_reason) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, medicine_name, issued_at)
);

-- Create indexes
CREATE INDEX doctors_directory_idx
  ON public.doctors (verification_status, status, accepting_appointments);
CREATE INDEX doctor_appointments_member_idx
  ON public.doctor_appointments (member_id, requested_at DESC);
CREATE INDEX doctor_appointments_doctor_idx
  ON public.doctor_appointments (doctor_id, status, requested_at DESC);
CREATE INDEX doctor_prescriptions_member_idx
  ON public.doctor_prescriptions (member_id, issued_at DESC);

-- Create triggers for updated_at
CREATE TRIGGER doctors_updated_at
BEFORE UPDATE ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER doctor_appointments_updated_at
BEFORE UPDATE ON public.doctor_appointments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_prescriptions ENABLE ROW LEVEL SECURITY;

-- Grant permissions to service_role (for API access)
REVOKE ALL ON public.doctors FROM anon, authenticated;
REVOKE ALL ON public.doctor_appointments FROM anon, authenticated;
REVOKE ALL ON public.doctor_prescriptions FROM anon, authenticated;
GRANT ALL PRIVILEGES ON public.doctors TO service_role;
GRANT ALL PRIVILEGES ON public.doctor_appointments TO service_role;
GRANT ALL PRIVILEGES ON public.doctor_prescriptions TO service_role;

-- MIGRATION 3: Add verification evidence columns
-- ============================================================================
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS credential_evidence_reference text,
  ADD COLUMN IF NOT EXISTS verification_note text;

ALTER TABLE public.doctors
  ADD CONSTRAINT doctors_evidence_required_when_verified CHECK (
    verification_status <> 'verified'
    OR (
      credential_evidence_reference IS NOT NULL
      AND char_length(trim(credential_evidence_reference)) BETWEEN 4 AND 500
    )
  ) NOT VALID;

ALTER TABLE public.doctors VALIDATE CONSTRAINT doctors_evidence_required_when_verified;

-- MIGRATION 4: Add doctor messaging
-- ============================================================================
CREATE TABLE public.doctor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.doctor_appointments(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('member', 'doctor')),
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 2000),
  client_message_id text NOT NULL CHECK (char_length(client_message_id) BETWEEN 8 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, sender_id, client_message_id)
);

CREATE INDEX doctor_messages_appointment_created_idx
  ON public.doctor_messages (appointment_id, created_at);

ALTER TABLE public.doctor_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.doctor_messages FROM anon, authenticated;
GRANT ALL PRIVILEGES ON public.doctor_messages TO service_role;

-- Update care_notifications event types
ALTER TABLE public.care_notifications
  DROP CONSTRAINT IF EXISTS care_notifications_event_type_check;
ALTER TABLE public.care_notifications
  ADD CONSTRAINT care_notifications_event_type_check CHECK (event_type IN (
    'session_assigned', 'session_accepted', 'session_rematching',
    'session_cancelled', 'session_completed', 'session_escalated',
    'session_message', 'follow_up_requested', 'follow_up_started',
    'safety_alert', 'doctor_request', 'doctor_status', 'doctor_message',
    'prescription_issued'
  ));

-- Create notification functions
CREATE OR REPLACE FUNCTION public.create_doctor_appointment_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    IF new.doctor_id IS NOT NULL THEN
      INSERT INTO public.care_notifications (recipient_id, event_type, event_key, metadata)
      VALUES (new.doctor_id, 'doctor_request', 'doctor:' || new.id || ':requested', jsonb_build_object('href', '/doctor?appointment=' || new.id))
      ON CONFLICT (event_key) DO NOTHING;
    ELSE
      INSERT INTO public.care_notifications (recipient_id, event_type, event_key, metadata)
      SELECT profile.id, 'doctor_request', 'doctor:' || new.id || ':unassigned:' || profile.id, jsonb_build_object(
        'href', '/admin/doctors',
        'unassigned', true,
        'urgency', new.urgency
      )
      FROM public.profiles profile
      WHERE profile.role = 'admin'
      ON CONFLICT (event_key) DO NOTHING;
    END IF;
  ELSIF tg_op = 'UPDATE' AND new.status IS DISTINCT FROM old.status THEN
    INSERT INTO public.care_notifications (recipient_id, event_type, event_key, metadata)
    VALUES (new.member_id, 'doctor_status', 'doctor:' || new.id || ':status:' || new.status, jsonb_build_object('href', '/doctors/appointments/' || new.id, 'status', new.status))
    ON CONFLICT (event_key) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_doctor_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE recipient uuid;
BEGIN
  SELECT CASE WHEN new.sender_id = appointment.member_id THEN appointment.doctor_id ELSE appointment.member_id END
  INTO recipient FROM public.doctor_appointments appointment WHERE appointment.id = new.appointment_id;
  IF recipient IS NOT NULL THEN
    INSERT INTO public.care_notifications (recipient_id, event_type, event_key, metadata)
    VALUES (recipient, 'doctor_message', 'doctor-message:' || new.id, jsonb_build_object(
      'href', CASE WHEN new.sender_role = 'member' THEN '/doctor?appointment=' || new.appointment_id ELSE '/doctors/appointments/' || new.appointment_id END
    )) ON CONFLICT (event_key) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_prescription_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    INSERT INTO public.care_notifications (recipient_id, event_type, event_key, metadata)
    VALUES (new.member_id, 'prescription_issued', 'prescription:' || new.id, jsonb_build_object('href', '/doctors/appointments/' || new.appointment_id))
    ON CONFLICT (event_key) DO NOTHING;
  ELSIF tg_op = 'UPDATE' AND new.status = 'voided' AND old.status IS DISTINCT FROM new.status THEN
    INSERT INTO public.care_notifications (recipient_id, event_type, event_key, metadata)
    VALUES (new.member_id, 'prescription_voided', 'prescription:' || new.id || ':voided', jsonb_build_object('href', '/doctors/appointments/' || new.appointment_id))
    ON CONFLICT (event_key) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

-- Create triggers
CREATE TRIGGER doctor_appointment_notifications
AFTER INSERT OR UPDATE OF status ON public.doctor_appointments
FOR EACH ROW EXECUTE FUNCTION public.create_doctor_appointment_notifications();

CREATE TRIGGER doctor_message_notifications
AFTER INSERT ON public.doctor_messages
FOR EACH ROW EXECUTE FUNCTION public.create_doctor_message_notification();

DROP TRIGGER IF EXISTS prescription_notifications ON public.doctor_prescriptions;
CREATE TRIGGER prescription_notifications
AFTER INSERT OR UPDATE OF status ON public.doctor_prescriptions
FOR EACH ROW EXECUTE FUNCTION public.create_prescription_notification();

-- MIGRATION 5: Add medical safety incidents support
-- ============================================================================
ALTER TABLE public.care_notifications
  DROP CONSTRAINT IF EXISTS care_notifications_event_type_check;
ALTER TABLE public.care_notifications
  ADD CONSTRAINT care_notifications_event_type_check CHECK (event_type IN (
    'session_assigned', 'session_accepted', 'session_rematching',
    'session_cancelled', 'session_completed', 'session_escalated',
    'session_message', 'follow_up_requested', 'follow_up_started',
    'safety_alert', 'doctor_request', 'doctor_status', 'doctor_message',
    'prescription_issued', 'medical_safety_block'
  ));

-- MIGRATION 6: Add prescription voiding columns
-- ============================================================================
ALTER TABLE public.doctor_prescriptions
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS void_reason text NOT NULL DEFAULT '' CHECK (char_length(void_reason) <= 500);

ALTER TABLE public.care_notifications
  DROP CONSTRAINT IF EXISTS care_notifications_event_type_check;
ALTER TABLE public.care_notifications
  ADD CONSTRAINT care_notifications_event_type_check CHECK (event_type IN (
    'session_assigned', 'session_accepted', 'session_rematching',
    'session_cancelled', 'session_completed', 'session_escalated',
    'session_message', 'follow_up_requested', 'follow_up_started',
    'safety_alert', 'doctor_request', 'doctor_status', 'doctor_message',
    'prescription_issued', 'prescription_voided', 'medical_safety_block'
  ));

-- MIGRATION 7: Add doctor profile photos storage bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('doctor-profile', 'doctor-profile', false, 3145728,
        array['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Verify the tables were created:
SELECT 'doctors table exists' as status, COUNT(*) as count FROM doctors;
SELECT 'doctor_appointments table exists' as status, COUNT(*) as count FROM doctor_appointments;
SELECT 'doctor_prescriptions table exists' as status, COUNT(*) as count FROM doctor_prescriptions;
SELECT 'doctor_messages table exists' as status, COUNT(*) as count FROM doctor_messages;

-- You should see 4 rows showing "0" count for each table (tables are empty but exist)
-- ============================================================================
