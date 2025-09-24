-- Create a certificate with a unique number for the completed course
INSERT INTO certificates (
  user_id,
  course_id,
  certificate_number,
  issue_date,
  expiry_date,
  final_score_percentage,
  completion_time_minutes,
  is_valid,
  issued_by,
  pdf_url,
  verification_url,
  qr_code_data
) VALUES (
  'af9d9f16-2643-475e-b118-d96cea5b8cb0',
  '8168fcab-00cc-45af-a865-db31af9223bf',
  'CERT-2025-' || LPAD(EXTRACT(DOY FROM NOW())::text, 3, '0') || '-' || LPAD((RANDOM() * 999)::int::text, 3, '0'),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '2 years',
  100.00,
  30,
  true,
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  'https://example.com/certificates/sample-certificate.pdf',
  'https://verify.example.com/cert-' || (RANDOM() * 99999)::int,
  'https://verify.example.com/cert-' || (RANDOM() * 99999)::int
);