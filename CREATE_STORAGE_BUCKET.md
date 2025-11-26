# Create Storage Bucket for Feature Attachments

The feature suggestion attachments require a Supabase storage bucket. Follow these steps to create it:

## Steps to Create the Bucket

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open Storage**
   - Click on "Storage" in the left sidebar

3. **Create New Bucket**
   - Click the "New bucket" button
   - Name: `feature-attachments`
   - **Important Settings:**
     - **Public bucket**: Check this box (so attachments can be accessed via public URLs)
     - **File size limit**: Set to a reasonable limit (e.g., 10MB or 20MB)
     - **Allowed MIME types**: Leave empty to allow all types, or specify:
       - `image/*` (for images)
       - `application/pdf` (for PDFs)

4. **Set Bucket Policies (RLS)**
   - After creating the bucket, click on it
   - Go to the "Policies" tab
   - You'll need to create policies to allow:
     - **INSERT**: Allow authenticated users to upload files
     - **SELECT**: Allow public read access (since it's a public bucket)

   **Example Policy for INSERT (Upload):**
   ```sql
   CREATE POLICY "Allow authenticated users to upload attachments"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'feature-attachments');
   ```

   **Example Policy for SELECT (Read):**
   ```sql
   CREATE POLICY "Allow public read access to attachments"
   ON storage.objects FOR SELECT
   TO anon
   USING (bucket_id = 'feature-attachments');
   ```

5. **Verify the Bucket**
   - The bucket should now appear in your Storage list
   - Try uploading a test file to verify it works

## Alternative: Use Supabase Dashboard UI

If you prefer using the UI instead of SQL:

1. After creating the bucket, go to "Policies"
2. Click "New Policy"
3. For INSERT policy:
   - Policy name: "Allow authenticated uploads"
   - Allowed operation: INSERT
   - Target roles: authenticated
   - USING expression: `bucket_id = 'feature-attachments'`
   - WITH CHECK expression: `bucket_id = 'feature-attachments'`

4. For SELECT policy:
   - Policy name: "Allow public reads"
   - Allowed operation: SELECT
   - Target roles: **anon** (this is the public/anonymous role in Supabase)
   - USING expression: `bucket_id = 'feature-attachments'`

## Notes

- The bucket must be **public** for the attachment URLs to work in emails and on the admin page
- File size limits should be set appropriately (recommended: 10-20MB per file)
- The code will continue to work even if attachments fail to upload - suggestions will be saved without attachment URLs

