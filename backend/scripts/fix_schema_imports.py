"""
Final cleanup:
1. Add StreamIncidentCreate to schemas.py
2. Clean up main.py - remove broken try/except, use schemas import
"""
import re

# ─── Step 1: Add to schemas.py ───────────────────────────────────────────────
schemas_path = r'e:\Personal\Resume\hack\backend\app\schemas.py'
with open(schemas_path, 'r', encoding='utf-8') as f:
    schemas = f.read()

new_schema = '''
class StreamIncidentCreate(BaseModel):
    username: str
    risk_score: float
    description: str
    command: Optional[str] = None
    location: Optional[str] = None
'''

if 'StreamIncidentCreate' not in schemas:
    schemas = schemas.rstrip() + '\n' + new_schema
    with open(schemas_path, 'w', encoding='utf-8') as f:
        f.write(schemas)
    print('Added StreamIncidentCreate to schemas.py')
else:
    print('StreamIncidentCreate already in schemas.py')

# ─── Step 2: Fix main.py ─────────────────────────────────────────────────────
main_path = r'e:\Personal\Resume\hack\backend\app\main.py'
with open(main_path, 'r', encoding='utf-8') as f:
    main = f.read()

# Remove any pydantic top-level import we added
main = main.replace('from pydantic import BaseModel\n', '')
main = main.replace('from typing import List, Optional, Dict, Any\n', 'from typing import List, Optional, Dict, Any\n')  # keep as-is

# Add StreamIncidentCreate to the schemas import block
old_import = ('    UserCreate, UserResponse, PolicyUpdate, PolicyResponse, DashboardStats, UserDirectoryResponse\n'
              ')')
new_import = ('    UserCreate, UserResponse, PolicyUpdate, PolicyResponse, DashboardStats, UserDirectoryResponse,\n'
              '    StreamIncidentCreate\n'
              ')')
main = main.replace(old_import, new_import)

# Remove the broken try/except block that wraps the class definition
broken_block = '''try:
    from pydantic import BaseModel as _PydanticBase
except ImportError:
    from fastapi._compat import _model_shortcut as _PydanticBase

class StreamIncidentCreate(_PydanticBase):'''

clean_class = '# StreamIncidentCreate is defined in schemas.py and imported above'
main = main.replace(broken_block, clean_class)

# Remove the field definitions that belonged to the now-removed inline class
# They appear immediately after the removed class header
fields_to_remove = (
    '    username: str\n'
    '    risk_score: float\n'
    '    description: str\n'
    '    command: Optional[str] = None\n'
    '    location: Optional[str] = None\n'
)
main = main.replace(fields_to_remove, '', 1)

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main)
print('Fixed main.py imports and cleaned up inline class definition')
