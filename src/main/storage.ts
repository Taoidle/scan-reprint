import { msg, appError, parseMessage } from '../shared/i18n';
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import type { Job } from '../shared/model';
import { validate } from '../shared/validate';
const maxHistoryBytes = 4 * 1024 * 1024;
export function parseHistory(value: unknown): Job[] {
  if (!Array.isArray(value) || value.length > 200) throw appError(msg('historyFormat'));
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw appError(msg('historyRecord'));
    const j = item as Record<string, unknown>;
    if (typeof j.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(j.id) || ids.has(j.id) ||
        typeof j.created !== 'string' || j.created.length > 40 || !Number.isFinite(Date.parse(j.created)) ||
        (typeof j.detail === 'string' && j.detail.length > 2048) ||
        !['queued', 'submitting', 'submitted', 'failed', 'uncertain'].includes(j.status as string)) {
      throw appError(msg('historyRecord'));
    }
    const label = validate(j.label);
    const saved = j.label as Record<string, unknown>;
    if (saved.content !== label.content || saved.symbology !== label.symbology) throw appError(msg('historyMismatch'));
    ids.add(j.id);
    return {id: j.id, created: j.created, detail: typeof j.detail==='string'?j.detail:parseMessage(j.detail), status: j.status as Job['status'], label};
  });
}
export function loadHistory(path: string): Job[] {
  if (!existsSync(path)) return [];
  if (statSync(path).size > maxHistoryBytes) throw appError(msg('historyLarge'));
  return parseHistory(JSON.parse(readFileSync(path, 'utf8')));
}
export function saveHistory(path: string, jobs: Job[]): void {
  const data = JSON.stringify(jobs);
  if (Buffer.byteLength(data) > maxHistoryBytes) throw appError(msg('historyLarge'));
  const fd = openSync(`${path}.tmp`, 'w', 0o600);
  try {writeFileSync(fd, data); fsyncSync(fd);} finally {closeSync(fd);}
  // Do not send a job unless the durable snapshot can be renamed successfully.
  renameSync(`${path}.tmp`, path);
}
