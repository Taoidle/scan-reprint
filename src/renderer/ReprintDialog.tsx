import { useEffect, useRef } from 'react';
import type { Job } from '../shared/model';
export function ReprintDialog({job,busy,cancel,confirm}:{job:Job;busy:boolean;cancel:()=>void;confirm:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  return <dialog ref={dialog} className="modal" aria-labelledby="reprint-title" onCancel={cancel}>
    <h2 id="reprint-title">确认明确重打</h2>
    <p>请先核对打印机，避免重复出纸。此操作将再次打印 {job.label.settings.copies} 份。</p>
    <pre>{job.label.content}</pre>
    <p>输出：{job.label.settings.transport} · {job.label.settings.printer||job.label.settings.host}</p>
    <div className="dialog-actions"><button autoFocus onClick={cancel}>取消</button><button className="primary" disabled={busy} onClick={confirm}>确认重打</button></div>
  </dialog>;
}
