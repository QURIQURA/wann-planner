CREATE POLICY "diary photos read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'diary-photos');
CREATE POLICY "diary photos insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'diary-photos');
CREATE POLICY "diary photos update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'diary-photos') WITH CHECK (bucket_id = 'diary-photos');
CREATE POLICY "diary photos delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'diary-photos');