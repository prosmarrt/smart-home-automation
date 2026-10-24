# Quick Start: Setting Up Remote Git Repository

Choose one of the following platforms to backup your code:

## Option 1: GitHub (Recommended)

1. **Create Repository on GitHub**
   - Go to https://github.com/new
   - Repository name: `smart-home-automation`
   - Description: `Smart Home Automation Application with Quotation System`
   - Visibility: **Private** (recommended for production code)
   - Do NOT initialize with README (we already have one)
   - Click "Create repository"

2. **Connect and Push**
   ```bash
   cd /workspace/app-85wlczelkwsh
   git remote add origin https://github.com/YOUR_USERNAME/smart-home-automation.git
   git branch -M main
   git push -u origin main
   ```

3. **Verify**
   - Refresh your GitHub repository page
   - You should see all files uploaded
   - Check the latest commit matches your local

## Option 2: GitLab

1. **Create Project on GitLab**
   - Go to https://gitlab.com/projects/new
   - Project name: `smart-home-automation`
   - Visibility: **Private**
   - Click "Create project"

2. **Connect and Push**
   ```bash
   cd /workspace/app-85wlczelkwsh
   git remote add origin https://gitlab.com/YOUR_USERNAME/smart-home-automation.git
   git branch -M main
   git push -u origin main
   ```

## Option 3: Bitbucket

1. **Create Repository on Bitbucket**
   - Go to https://bitbucket.org/repo/create
   - Repository name: `smart-home-automation`
   - Access level: **Private**
   - Click "Create repository"

2. **Connect and Push**
   ```bash
   cd /workspace/app-85wlczelkwsh
   git remote add origin https://bitbucket.org/YOUR_USERNAME/smart-home-automation.git
   git branch -M main
   git push -u origin main
   ```

## Next Steps

After pushing to remote:

1. **Verify Backup**
   ```bash
   git remote -v
   git log --oneline -5
   ```

2. **Set Up Regular Backups**
   - Commit changes daily: `git add . && git commit -m "Update: description" && git push`
   - Or use the automated backup script in BACKUP_SETUP_GUIDE.md

3. **Configure Secrets** (if using CI/CD)
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to repository secrets
   - Never commit `.env` files

## Current Repository Status

✅ Git initialized
✅ Initial commit created
✅ All files staged and committed
✅ .gitignore configured
✅ Ready to push to remote

**Latest commits:**
- Backup setup guide documentation
- Google Sheets backup integration
- Discount feature implementation
- Payment tracking fixes

## Troubleshooting

**Authentication Issues:**
- Use Personal Access Token instead of password
- GitHub: Settings > Developer settings > Personal access tokens
- GitLab: Preferences > Access Tokens
- Bitbucket: Personal settings > App passwords

**Push Rejected:**
```bash
# If remote has changes you don't have locally
git pull origin main --rebase
git push origin main
```

For detailed backup procedures, see `BACKUP_SETUP_GUIDE.md`
