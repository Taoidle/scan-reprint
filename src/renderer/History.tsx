import { msg } from '../shared/i18n';
import { useLocale } from './Locale';
import { names, statuses, type Job } from '../shared/model';
export function History({jobs,reprint}:{jobs:Job[];reprint:(job:Job)=>void}) {
  const {t,locale}=useLocale();
  return <section className="panel history"><h2>{t(msg('historyTitle'))}</h2><div className="table-wrap"><table><thead><tr><th>{t(msg('time'))}</th><th>{t(msg('content'))}</th><th>{t(msg('symbology'))}</th><th>{t(msg('status'))}</th><th>{t(msg('action'))}</th></tr></thead><tbody>{jobs.length===0?<tr><td colSpan={5} className="empty">{t(msg('noHistory'))}</td></tr>:[...jobs].reverse().map(job=><tr key={job.id}><td>{new Date(job.created).toLocaleString(locale)}</td><td className="content" title={job.label.content}>{job.label.content}</td><td>{names[job.label.symbology]}</td><td><span className={`status ${job.status}`}>{t(statuses[job.status])}</span><small>{typeof job.detail==='string'?t(msg('legacyDetail',{text:job.detail})):t(job.detail)}</small></td><td><button className="link" disabled={['queued','submitting'].includes(job.status)} onClick={()=>reprint(job)}>{t(msg('reprint'))}</button></td></tr>)}</tbody></table></div><p className="hint">{t(msg('historyHint'))}</p></section>;
}
