export function trustedFrame(actual:string,expected:string,isMain:boolean):boolean {return isMain && actual===expected;}
export function escapeHtml(value:string):string {return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
