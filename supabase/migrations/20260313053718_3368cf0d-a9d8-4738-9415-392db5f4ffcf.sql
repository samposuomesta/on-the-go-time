
-- Create storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to receipts
CREATE POLICY "Public read receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');

-- Allow insert for anyone (demo mode)
CREATE POLICY "Allow insert receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
