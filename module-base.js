/* ─────────────────────────────────────────────────────────────────────────────
   CREWKIT — module-base.js
   Shared utilities for module pages (framework-builder, team-member).
   Must be loaded after validator.js and app.js.
   ───────────────────────────────────────────────────────────────────────────── */

const ModuleBase = {

  /* ── safeSave ──────────────────────────────────────────────────────────────
     Runs Validator.validateSetup() before persisting.
     Blocks on L1 (errors), allows L2 (warnings).
     Returns true if saved, false if blocked.                                   */
  safeSave(data) {
    const result = Validator.validateSetup(data);
    if (result.level === 1) {
      Toast.show('Cannot save: setup has validation errors.', 'error');
      return false;
    }
    App.saveToStorage(data);
    return true;
  },

};
