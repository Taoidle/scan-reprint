import { msg } from '../shared/i18n';
import { useLocale } from './Locale';
import { useEffect, useRef } from 'react';
import type { Job } from '../shared/model';
export function ReprintDialog({job,busy,cancel,confirm}:{job:Job;busy:boolean;cancel:()=>void;confirm:()=>void}) {
  const {t}=useLocale();
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  return <dialog ref={dialog} className="modal" aria-labelledby="reprint-title" onCancel={cancel}>
    <h2 id="reprint-title">{t(msg('reprintTitle'))}</h2>
    <p>{t(msg('reprintHint',{count:job.label.settings.copies}))}</p>
    <pre>{job.label.content}</pre>
    <p>{t(msg('output'))}{job.label.settings.transport} · {job.label.settings.printer||job.label.settings.host}</p>
    <div className="dialog-actions"><button autoFocus onClick={cancel}>{t(msg('cancel'))}</button><button className="primary" disabled={busy} onClick={confirm}>{t(msg('confirmReprint'))}</button></div>
  </dialog>;
}
