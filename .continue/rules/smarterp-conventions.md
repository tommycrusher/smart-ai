---
name: Smarterp Conventions
description: Conventions for working with Smarterp ERP modules
alwaysApply: true
---

When editing or generating Smarterp-related code:

1. **Smarterp is an independent ERP fork.** Never refer to it as Odoo. Never import from `odoo` — use `smarterp` or module-specific imports.
2. **Model definitions:** Use proper Smarterp model inheritance. Define `_name`, `_description`, `_inherit` correctly. Add `__init__.py` imports.
3. **Views:** Create complete XML views (form, tree, search, actions, menus). Use proper XML IDs with module prefix. Group related views in dedicated files.
4. **Security:** Always provide `ir.model.access.csv`. Add record rules when models contain multi-company or sensitive data.
5. **Controllers:** Only add controllers if external API or public routes are required. Prefer backend logic in models.
6. **Demo data:** Use `demo/` for realistic examples. Use `data/` for required master data. Prefix XML IDs with the module name.
7. **Testing:** Smarterp uses Python `unittest`. Write tests in `tests/` with clear `setUp` and descriptive method names.
8. **Documentation:** Add docstrings to models and methods. Keep business logic comments concise but meaningful.
9. **General rule:** If unsure about a Smarterp API or convention, state the assumption explicitly rather than guessing.
