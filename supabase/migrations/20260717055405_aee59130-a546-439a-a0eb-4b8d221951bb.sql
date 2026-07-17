
CREATE POLICY "authed read stickers" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'stickers');
CREATE POLICY "authed insert stickers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'stickers');
CREATE POLICY "authed update stickers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'stickers') WITH CHECK (bucket_id = 'stickers');
CREATE POLICY "authed delete stickers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'stickers');
