// finance.js — Cálculos financieros
// Sigue metodología de rentabilidad neta sobre capital y yield bruta/neta BTR
// cS/cF/cB reciben todo por parámetros y son puras.
// vF/vB leen F.pl/B internamente; cF lee window._presupuestoTotal si existe.

function cS(s){const it=s.pc*s.itp/100,nr=s.pc*s.not/100,hn=s.pc*s.hon/100,ga=it+nr+s.dd+hn,pr=s.fin?s.pc*s.ltv/100:0,r=s.ti/100/12,n=s.hip*12,cm=pr>0&&r>0?pr*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1):0;return{it,nr,hn,ga,pr,cm};}
function cF(s,f){const b=cS(s),cr=window._presupuestoTotal||f.sup*f.rm2,co=cr*f.ct/100,io=s.fin?b.pr*s.ti/100*f.pl/12:0,tot=s.pc+b.ga+cr+co+f.ind+io,cap=Math.max(s.fin?s.pc*(1-s.ltv/100)+b.ga+cr+co+f.ind+io:tot,1),gve=f.pv*f.gv/100,ing=f.pv-gve,mb=f.pv-tot,mn=ing-tot,rt=mn/tot*100,rc=mn/cap*100,ra=f.pl>0?(Math.pow(Math.max(1+rc/100,.0001),12/f.pl)-1)*100:NaN,sens=[-10,-5,0,5,10].map(pp=>{const pve=f.pv*(1+pp/100);return[-15,0,15].map(rp=>{const crf=cr*(1+rp/100),cf2=crf*f.ct/100,t2=s.pc+b.ga+crf+cf2+f.ind+io,mn2=pve*(1-f.gv/100)-t2,c2=Math.max(s.fin?s.pc*(1-s.ltv/100)+b.ga+crf+cf2+f.ind+io:t2,1);return mn2/c2*100;});});return{...b,cr,co,io,tot,cap,gve,ing,mb,mn,rt,rc,ra,sens};}
function cB(s,b2){const b=cS(s),ref=window._presupuestoTotal||b2.ref,co=ref*b2.ct/100,tot=s.pc+b.ga+ref+co,cap=Math.max(tot-b.pr,1),ca=b.cm*12,ra=b2.rnt*12,ve=ra*b2.vac/100,ie=ra-ve,si=b2.imp?ra*.045:0,mt=s.pc*b2.mnt/100,gs=ra*b2.ges/100,gt=b2.ibi+b2.com+b2.seg+si+mt+gs,bn=ie-gt,rb=ra/Math.max(tot,1)*100,rn=bn/Math.max(tot,1)*100,cf=bn-ca,coc=s.fin?cf/cap*100:rn,pb=bn>0?tot/bn:Infinity,gf=b2.ibi+b2.com+b2.seg+mt,dn=1-b2.vac/100-(b2.imp?.045:0)-b2.ges/100,r7=dn>.05?(tot*.07+gf)/dn/12:0;return{...b,co,ref,tot,cap,ca,ra,ve,ie,si,mt,gs,gt,bn,rb,rn,cf,coc,pb,r7};}
// Expose calculation functions globally
window.cS = cS;
window.cF = cF;
window.cB = cB;

function vF(rc,mn){if(!isFinite(rc)||mn<=0)return{c:'dis',i:'✕',l:'Descartar',w:'Sin margen neto positivo.'};if(rc>=25)return{c:'buy',i:'✓',l:'Comprar',w:`ROI sobre capital del ${ep(rc)} en ${F.pl} meses. Margen sólido.`};if(rc>=15)return{c:'neg',i:'~',l:'Negociar',w:`ROI del ${ep(rc)} ajustado. Negociar precio o reducir reforma.`};return{c:'dis',i:'✕',l:'Descartar',w:`ROI del ${ep(rc)} insuficiente. No compensa riesgo ni iliquidez.`};}
function vB(rn,coc,fin){const m=fin?coc:rn,lb=fin?'cash on cash':'rentabilidad neta';if(!isFinite(m)||m<=0)return{c:'dis',i:'✕',l:'Descartar',w:'Rentabilidad negativa.'};if(m>=7)return{c:'buy',i:'✓',l:'Comprar',w:`${ep(m)} de ${lb}. Yield sólido.`};if(m>=5)return{c:'neg',i:'~',l:'Negociar',w:`${ep(m)} de ${lb}. Correcto pero con margen. Negociar precio.`};if(m>=3.5)return{c:'neg',i:'~',l:'Negociar',w:`${ep(m)} de ${lb}. Ajustado. Solo válido con fuerte revalorización.`};return{c:'dis',i:'✕',l:'Descartar',w:`${ep(m)} de ${lb}. Por debajo del umbral mínimo.`};}

// ═══════════════════════════════════════════════════════
// § 6 · CONSTRUCTORES DE UI  —  Helpers HTML
// ═══════════════════════════════════════════════════════
