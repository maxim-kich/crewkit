/* ─────────────────────────────────────────────────────────────────────────────
   CREWKIT — validator.js
   Validates setup.json against the schema.
   Returns { valid, level, errors, warnings }
   level 0 = clean, level 1 = blocking errors, level 2 = warnings only
   ───────────────────────────────────────────────────────────────────────────── */

const CURRENT_VERSION = '1.0';
const KNOWN_THEMES    = ['light', 'dark', 'system'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_RE  = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function isUUID(v)   { return typeof v === 'string' && UUID_RE.test(v); }
function isISO(v)    { return typeof v === 'string' && ISO_RE.test(v); }
function isString(v) { return typeof v === 'string'; }
function isArray(v)  { return Array.isArray(v); }
function isObj(v)    { return v !== null && typeof v === 'object' && !Array.isArray(v); }

/* ─────────────────────────────────────────────────────────────────────────────
   Main export
   ───────────────────────────────────────────────────────────────────────────── */
function validateSetup(data) {
  const errors   = [];
  const warnings = [];

  function e(msg, field) { errors.push({ msg, field }); }
  function w(msg, field) { warnings.push({ msg, field }); }

  // ── Root shape ─────────────────────────────────────────────────────────────
  if (!isObj(data)) {
    e('setup.json must be a JSON object.', 'root');
    return finish();
  }

  // ── Meta ───────────────────────────────────────────────────────────────────
  if (!isObj(data.meta)) {
    e('meta is missing or not an object.', 'meta');
  } else {
    if (!isString(data.meta.version) || !data.meta.version.trim())
      e('meta.version is missing.', 'meta.version');
    if (!isISO(data.meta.createdAt))
      w('meta.createdAt is missing or not a valid ISO date.', 'meta.createdAt');
    if (!isISO(data.meta.updatedAt))
      w('meta.updatedAt is missing or not a valid ISO date.', 'meta.updatedAt');
  }

  // ── Company ────────────────────────────────────────────────────────────────
  if (!isObj(data.company)) {
    e('company is missing or not an object.', 'company');
  } else {
    if (!isString(data.company.name) || !data.company.name.trim())
      e('company.name is missing.', 'company.name');
    if (data.company.theme && !KNOWN_THEMES.includes(data.company.theme))
      w(`company.theme "${data.company.theme}" is not a known theme.`, 'company.theme');
  }

  // ── User ───────────────────────────────────────────────────────────────────
  if (!isObj(data.user)) {
    e('user is missing or not an object.', 'user');
  } else {
    if (!isString(data.user.name) || !data.user.name.trim())
      e('user.name is missing.', 'user.name');
  }

  // ── Artifacts ──────────────────────────────────────────────────────────────
  if (data.artifacts !== undefined) {
    if (!isArray(data.artifacts)) {
      e('artifacts must be an array.', 'artifacts');
    } else {
      data.artifacts.forEach((fw, fi) => {
        const fp = `artifacts[${fi}]`;
        if (!isObj(fw)) { e(`${fp} must be an object.`, fp); return; }
        if (!isString(fw.id) || !fw.id.trim()) e(`${fp}.id is missing.`, `${fp}.id`);
        if (!isString(fw.name) || !fw.name.trim()) e(`${fp}.name is missing.`, `${fp}.name`);

        // Determine model (default to matrix for backward compatibility)
        const model = fw.model || 'matrix';

        if (model === 'questionnaire') {
          // Validate questionnaire structure
          if (fw.fields !== undefined) {
            if (!isArray(fw.fields)) {
              w(`${fp}.fields must be an array.`, `${fp}.fields`);
            } else {
              fw.fields.forEach((field, fi) => {
                const fieldp = `${fp}.fields[${fi}]`;
                if (!isObj(field)) { w(`${fieldp} must be an object.`, fieldp); return; }
                if (!isString(field.id) || !field.id.trim()) w(`${fieldp}.id is missing.`, `${fieldp}.id`);
                if (!isString(field.name) || !field.name.trim()) w(`${fieldp}.name is missing.`, `${fieldp}.name`);
                if (!isString(field.type) || !field.type.trim()) w(`${fieldp}.type is missing.`, `${fieldp}.type`);
                if (field.options !== undefined && !isArray(field.options)) {
                  w(`${fieldp}.options must be an array.`, `${fieldp}.options`);
                }
              });
            }
          }
        } else {
          // Validate matrix structure
          if (!isString(fw.type) || !fw.type.trim()) w(`${fp}.type is missing.`, `${fp}.type`);
          if (fw.columns !== undefined) {
            if (!isArray(fw.columns)) {
              e(`${fp}.columns must be an array.`, `${fp}.columns`);
            } else {
              fw.columns.forEach((col, ci) => {
                const cp = `${fp}.columns[${ci}]`;
                if (!isObj(col))                           { w(`${cp} must be an object.`, cp); return; }
                if (!isString(col.id) || !col.id.trim())   w(`${cp}.id is missing.`, `${cp}.id`);
              });
            }
          }
          if (fw.groups !== undefined) {
            if (!isArray(fw.groups)) {
              w(`${fp}.groups must be an array.`, `${fp}.groups`);
            } else {
              fw.groups.forEach((g, gi) => {
                const gp = `${fp}.groups[${gi}]`;
                if (!isObj(g))                           { w(`${gp} must be an object.`, gp); return; }
                if (!isString(g.id) || !g.id.trim())     w(`${gp}.id is missing.`, `${gp}.id`);
                if (isArray(g.rows)) {
                  g.rows.forEach((row, ri) => {
                    const rp = `${gp}.rows[${ri}]`;
                    if (!isObj(row))                         { w(`${rp} must be an object.`, rp); return; }
                    if (!isString(row.id) || !row.id.trim()) w(`${rp}.id is missing.`, `${rp}.id`);
                  });
                }
              });
            }
          }
        }
      });
    }
  }

  // ── Team Members ───────────────────────────────────────────────────────────
  if (data.crewMembers !== undefined) {
    if (!isArray(data.crewMembers)) {
      e('crewMembers must be an array.', 'crewMembers');
    } else {
      data.crewMembers.forEach((tm, ti) => {
        const tp = `crewMembers[${ti}]`;
        if (!isObj(tm)) { e(`${tp} must be an object.`, tp); return; }
        if (!isString(tm.id) || !tm.id.trim()) e(`${tp}.id is missing.`, `${tp}.id`);
        if (!isString(tm.name) || !tm.name.trim()) e(`${tp}.name is missing.`, `${tp}.name`);
        if (tm.instances !== undefined && !isArray(tm.instances))
          e(`${tp}.instances must be an array.`, `${tp}.instances`);
      });
    }
  }

  // ── Initiatives ─────────────────────────────────────────────────────────────
  if (data.initiatives !== undefined) {
    if (!isObj(data.initiatives)) {
      e('initiatives must be an object.', 'initiatives');
    } else {
      const columnOrder = data.initiatives.columnOrder || (data.initiatives.columns ? Object.keys(data.initiatives.columns) : []);
      columnOrder.forEach(column => {
        if (data.initiatives[column] !== undefined) {
          if (!isArray(data.initiatives[column])) {
            e(`initiatives.${column} must be an array.`, `initiatives.${column}`);
          } else {
            data.initiatives[column].forEach((init, ii) => {
              const ip = `initiatives.${column}[${ii}]`;
              if (!isObj(init)) { w(`${ip} must be an object.`, ip); return; }
              if (!isString(init.id) || !init.id.trim()) w(`${ip}.id is missing.`, `${ip}.id`);
              if (!isString(init.name) || !init.name.trim()) w(`${ip}.name is missing.`, `${ip}.name`);
            });
          }
        }
      });
    }
  }

  return finish();

  function finish() {
    const valid = errors.length === 0;
    const level = errors.length ? 1 : warnings.length ? 2 : 0;
    return { valid, level, errors, warnings };
  }
}

/* ── Expose ───────────────────────────────────────────────────────────────── */
const Validator = { validateSetup, CURRENT_VERSION };
