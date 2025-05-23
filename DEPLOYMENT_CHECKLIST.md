# Deployment Checklist for DWS Chatbot

## Pre-Deployment Checks

### 1. Code Quality
- [ ] Run `npm run build` locally - no errors
- [ ] Run `npm test` (if tests exist) - all pass
- [ ] Check browser console - no errors on key pages
- [ ] Verify TypeScript - no type errors

### 2. Git Status
- [ ] All changes committed with descriptive messages
- [ ] Pushed to GitHub main branch
- [ ] Verify on GitHub: https://github.com/bigballadanny/dwschatbot

### 3. Environment Variables
Ensure these are set in Lovable:
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`

## Deployment Steps

### 1. Push to GitHub
```bash
git status
git add .
git commit -m "feat/fix/chore: Description of changes"
git push origin main
```

### 2. Lovable Deployment
- Lovable automatically detects GitHub changes
- Monitor deployment status in Lovable dashboard
- Check for any build errors

### 3. Database Migrations
If database changes were made:
```bash
supabase db push
```

### 4. Edge Functions
If edge functions were modified:
```bash
supabase functions deploy process-transcript
supabase functions deploy ai-chat
```

## Post-Deployment Verification

### 1. Authentication
- [ ] Login works with all providers
- [ ] No console errors on auth pages
- [ ] Protected routes redirect properly

### 2. Core Features
- [ ] Transcripts page loads
- [ ] Chat interface works
- [ ] File uploads function
- [ ] Search/RAG features work

### 3. UI/UX
- [ ] Mobile responsive
- [ ] Loading states show properly
- [ ] Error messages are user-friendly
- [ ] No layout breaks

### 4. Performance
- [ ] Page load times acceptable
- [ ] No memory leaks in chat
- [ ] API responses timely

## Rollback Plan
If issues occur:
1. Revert to previous commit: `git revert HEAD`
2. Push revert: `git push origin main`
3. Lovable will redeploy previous version

## Monitoring
- Check Supabase logs for errors
- Monitor browser console for client-side errors
- Watch for user reports of issues

## Common Issues & Solutions

### Storage Bucket Errors
- Ensure bucket exists in Supabase
- Check RLS policies are configured

### Auth Errors
- Verify redirect URLs in Supabase
- Check environment variables

### Chat Not Working
- Verify AI service account configured
- Check edge function logs

## Support Contacts
- GitHub Repo: https://github.com/bigballadanny/dwschatbot
- Lovable Platform: [Your Lovable URL]
- Supabase Dashboard: [Your Supabase URL]