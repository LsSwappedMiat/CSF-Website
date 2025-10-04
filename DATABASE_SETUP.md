# Supabase Database Schema

## Setup Instructions

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key to `.env` file
3. Run these SQL commands in the Supabase SQL Editor:

## SQL Schema

```sql
-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET timezone TO 'UTC';

-- Create user_profiles table
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  flags JSONB DEFAULT '{"viewer": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spots table
CREATE TABLE spots (
  id TEXT PRIMARY KEY,
  price INTEGER NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'rect',
  x REAL,
  y REAL,
  w REAL,
  h REAL,
  cx REAL,
  cy REAL,
  r REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id TEXT REFERENCES spots(id) NOT NULL,
  customer_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  description TEXT,
  addons JSONB DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
  payment_intent_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_id, status) -- Ensure only one confirmed booking per spot
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND flags->>'admin' = 'true'
    )
  );

-- Spots: Public read, admin write
CREATE POLICY "Anyone can read spots" ON spots
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage spots" ON spots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND flags->>'admin' = 'true'
    )
  );

-- Bookings: Admins can read all, users can create
CREATE POLICY "Admins can read all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND flags->>'admin' = 'true'
    )
  );

CREATE POLICY "Anyone can create bookings" ON bookings
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_bookings_spot_id ON bookings(spot_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_user_profiles_flags ON user_profiles USING GIN(flags);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spots_updated_at BEFORE UPDATE ON spots 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Data Migration

To migrate your existing localStorage data, use the migration script:

```javascript
// Run this in browser console on your current site
const spots = JSON.parse(localStorage.getItem('vendor_spots_v1') || '[]');
const reservations = JSON.parse(localStorage.getItem('vendor_map_reservations_v1') || '{}');

console.log('Spots to migrate:', spots);
console.log('Reservations to migrate:', reservations);
```

## Environment Variables

Create `.env` file with:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```