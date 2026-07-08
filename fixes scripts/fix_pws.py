import re

with open('backend/api/routes/pws.py', 'r') as f:
    content = f.read()

# Original project creation logic:
old_project_logic = """    if item.type == 'project':
        current_year = datetime.now().year
        # Count existing projects for this year to get sequential number
        # A simple approach is just counting all projects and adding 1, since this is a demo
        count = db.query(PWSItem).filter(PWSItem.type == 'project').count()
        seq = count + 1
        
        # E.g. PRSJ-2026-001-B001
        project_id = f"PRSJ-{current_year}-{seq:03d}-B001"
        # E.g. PBSJ-2026-001
        batch_id = f"PBSJ-{current_year}-{seq:03d}"
        
        db_item.project_code = project_id
        db_item.batch_id = batch_id"""

new_logic = """    if item.type == 'project':
        current_year = datetime.now().year
        count = db.query(PWSItem).filter(PWSItem.type == 'project').count()
        seq = count + 1
        project_id = f"PRSJ-{current_year}-{seq:03d}-B001"
        db_item.project_code = project_id

    if item.type == 'workflow':
        current_year = datetime.now().year
        count = db.query(PWSItem).filter(PWSItem.type == 'workflow').count()
        seq = count + 1
        batch_id = f"PBSJ-{current_year}-{seq:03d}"
        db_item.batch_id = batch_id"""

content = content.replace(old_project_logic, new_logic)

with open('backend/api/routes/pws.py', 'w') as f:
    f.write(content)

