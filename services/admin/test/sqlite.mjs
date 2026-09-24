import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function testEnv() {
  const native = new DatabaseSync(':memory:');
  native.exec(readFileSync(new URL('../../../migrations/admin.sql', import.meta.url), 'utf8'));
  native.exec(readFileSync(new URL('../../../migrations/ai-safety.sql', import.meta.url), 'utf8'));
  const prepare = (query, args = []) => ({
    bind(...v) {
      return prepare(query, v);
    },
    async first() {
      return native.prepare(query).get(...args) || null;
    },
    async all() {
      return { results: native.prepare(query).all(...args) };
    },
    async run() {
      return { meta: { changes: native.prepare(query).run(...args).changes } };
    },
    execute() {
      const s = native.prepare(query);
      return s.columns().length ? { results: s.all(...args) } : { meta: { changes: s.run(...args).changes } };
    },
  });
  return {
    DB: {
      prepare,
      async batch(statements) {
        native.exec('BEGIN');
        try {
          const out = statements.map(s => s.execute());
          native.exec('COMMIT');
          return out;
        } catch (e) {
          native.exec('ROLLBACK');
          throw e;
        }
      },
    },
    ADMIN_ENCRYPTION_KEY: btoa('b'.repeat(32)),
  };
}
