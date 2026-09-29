FBPATHSHALA ADMIN PANEL

Upload this folder as /admin/ in the repository. Student Site files are not included and are not changed.
Open: /admin/admin.html

Features:
- Category -> Folder -> Set
- Manual question upload
- CSV / Excel import with preview
- Question Bank filtering/search
- Exam creation and active/inactive status
- Exam Settings: name, examiner, syllabus, marks, pass mark, duration, negative marking, dates, randomization, etc.
- Select Question Bank questions into an Exam
- Copy Exam Link

Supabase setup:
The project URL and publishable key from the existing project are already configured in js/supabase.js.
Only an authenticated Supabase Admin account can log in.

If the database is missing any of the newer Question Bank / Exam mapping columns or tables, run SUPABASE_SETUP.sql once in Supabase SQL Editor.
