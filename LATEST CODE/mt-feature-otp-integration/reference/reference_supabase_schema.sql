-- ==============================================================================
-- MEDITRAIL SUPABASE DATABASE SCHEMA & INITIAL SEED DATA
-- Run this script in your Supabase Dashboard -> SQL Editor
-- Project ID: zxcqicubcrqsxubnnmpp
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    city TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. STAFF PROFILES (RBAC for Hospital Super Admins & Doctors)
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('super_admin', 'doctor')) NOT NULL DEFAULT 'doctor',
    hospital_id UUID REFERENCES public.hospitals(id),
    department TEXT,
    license_id TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_code TEXT UNIQUE NOT NULL DEFAULT 'MT-10482',
    name TEXT NOT NULL,
    age INT NOT NULL,
    dob DATE NOT NULL,
    gender TEXT NOT NULL,
    blood_group TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    allergies TEXT[] DEFAULT '{}',
    chronic_conditions TEXT[] DEFAULT '{}',
    insurance_provider TEXT,
    policy_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. MEDICAL RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_code TEXT NOT NULL DEFAULT 'MT-10482',
    year INT NOT NULL,
    event_date TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    hospital_name TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    department TEXT NOT NULL,
    short_description TEXT,
    diagnosis TEXT,
    procedure_notes TEXT,
    clinical_notes TEXT,
    treatment_plan TEXT,
    medications JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. SECURITY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_name TEXT NOT NULL,
    patient_code TEXT NOT NULL,
    hospital_name TEXT NOT NULL,
    action TEXT NOT NULL,
    ip_address TEXT DEFAULT '192.168.1.1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ENABLE ROW LEVEL SECURITY (RLS) & PROTECTED POLICIES
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Hospital policies (open to system API / anon key)
DROP POLICY IF EXISTS "Hospitals select for authenticated users" ON public.hospitals;
DROP POLICY IF EXISTS "Hospitals select policy" ON public.hospitals;
DROP POLICY IF EXISTS "Hospitals insert policy" ON public.hospitals;
DROP POLICY IF EXISTS "Hospitals update policy" ON public.hospitals;
DROP POLICY IF EXISTS "Hospitals delete policy" ON public.hospitals;

CREATE POLICY "Hospitals select policy" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "Hospitals insert policy" ON public.hospitals FOR INSERT WITH CHECK (true);
CREATE POLICY "Hospitals update policy" ON public.hospitals FOR UPDATE USING (true);
CREATE POLICY "Hospitals delete policy" ON public.hospitals FOR DELETE USING (true);

-- Staff profiles policies
CREATE POLICY "Staff profiles select for super admin or own" ON public.staff_profiles FOR SELECT USING (auth.role() = 'super_admin' OR auth.uid() = user_id);
CREATE POLICY "Staff profiles insert for super admin" ON public.staff_profiles FOR INSERT WITH CHECK (auth.role() = 'super_admin');
CREATE POLICY "Staff profiles update for super admin" ON public.staff_profiles FOR UPDATE USING (auth.role() = 'super_admin') WITH CHECK (auth.role() = 'super_admin');
CREATE POLICY "Staff profiles delete for super admin" ON public.staff_profiles FOR DELETE USING (auth.role() = 'super_admin');

-- Patients policies
CREATE POLICY "Patients select for authenticated users" ON public.patients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Patients insert for authenticated users" ON public.patients FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Patients update for authenticated users" ON public.patients FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Medical records policies
CREATE POLICY "Medical records select for authenticated users" ON public.medical_records FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Medical records insert for authenticated users" ON public.medical_records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Medical records update for authenticated users" ON public.medical_records FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Audit logs policies
CREATE POLICY "Audit logs select for super admin" ON public.audit_logs FOR SELECT USING (auth.role() = 'super_admin');
CREATE POLICY "Audit logs insert for authenticated users" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 8. INITIAL SEED DATA
INSERT INTO public.hospitals (name, code, city) 
VALUES 
('St. Jude Orthopedic Care', 'STJUDE-01', 'Mumbai'),
('KJ Somaiya Hospital & Research Centre', 'KJS-04', 'Mumbai')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.patients (patient_code, name, age, dob, gender, blood_group, phone, allergies, chronic_conditions, insurance_provider, policy_number)
VALUES ('MT-10482', 'Aarnav Mehta', 24, '2002-04-15', 'Male', 'B+', '9876543210', ARRAY['Penicillin', 'Dust Mites'], ARRAY['Mild Asthma (controlled)'], 'Star Health Premier', 'SHP-8849201-B')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO public.staff_profiles (name, email, role, department, license_id, status, hospital_name)
VALUES 
('Dr. Arthur Vance (Platform Owner)', 'admin@stjude.org', 'super_admin', 'Platform Operations', 'MCI-00100-IN', 'Active', 'MediTrail Platform'),
('Karan Johar (Hospital Main Admin)', 'hospadmin@stjude.org', 'hospital_admin', 'Hospital Management', 'ADM-9080-IN', 'Active', 'St. Jude Orthopedic Care'),
('Vikram Malhotra (Hospital Main Admin)', 'admin@kjsomaiya.org', 'hospital_admin', 'Hospital Management', 'ADM-9099-IN', 'Active', 'KJ Somaiya Hospital & Research Centre'),
('Dr. Meera Nambiar', 'dr.nambiar@stjude.org', 'doctor', 'Orthopedics & Sports Medicine', 'MCI-88942-IN', 'Active', 'St. Jude Orthopedic Care'),
('Dr. Sameer Deshmukh', 'dr.deshmukh@kjsomaiya.org', 'doctor', 'General Surgery & Laparoscopy', 'MCI-33108-IN', 'Active', 'KJ Somaiya Hospital & Research Centre')
ON CONFLICT (email) DO NOTHING;
