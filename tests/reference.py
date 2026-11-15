"""Independent SciPy binomial / scalar optimizer / Python path accounting, test only."""
import json,subprocess,math
import numpy as np
from scipy.stats import binom
from scipy.optimize import minimize_scalar
checks=0;maxerr=0
for c in json.loads(subprocess.check_output(['node','tools/dump.mjs'],text=True)):
 p=c['input'];n=p['bets'];prob=p['actual'];b=p['payoff'];w=np.arange(n+1);mass=binom.pmf(w,n,prob)
 obj=lambda f: -(prob*math.log1p(b*f)+(1-prob)*math.log1p(-f))
 opt=minimize_scalar(obj,bounds=(0,.999),method='bounded',options={'xatol':1e-14})
 assert obj(c['actualKelly'])<=opt.fun+1e-12;checks+=1
 state=p['seed'];paths=[]
 for k in range(128):
  path=[]
  for t in range(n):
   state=(state^(state<<13))&0xffffffff;state=(state^(state>>17))&0xffffffff;state=(state^(state<<5))&0xffffffff;path.append(state/4294967296<prob)
  paths.append(path)
 for s in c['strategies']:
  f=s['fraction'];logs=w*np.log1p(b*f)+(n-w)*np.log1p(-f);q=binom.ppf(.5,n,prob);med=math.exp(q*math.log1p(b*f)+(n-q)*math.log1p(-f));below=float(mass[logs< -1e-12].sum());mean=float(np.sum(mass*np.exp(logs)))
  for key,ref in [('meanTerminal',mean),('medianTerminal',med),('belowInitial',below),('growth',-obj(f))]:
   err=abs(s[key]-ref)/max(1,abs(ref));maxerr=max(maxerr,err);assert err<2e-11,(key,s[key],ref);checks+=1
  dds=[]
  for k,path in enumerate(paths):
   # Work with actual multipliers, independent of production log peak formula.
   wealth=1.;peak=1.;dd=0
   for t,win in enumerate(path):
    wealth*=1+b*f if win else 1-f;peak=max(peak,wealth);dd=max(dd,1-wealth/peak)
    if k==0:
     err=abs(math.log(wealth)-s['firstLogPath'][t+1]);assert err<1e-10;checks+=1
   dds.append(dd)
  assert abs(sum(d>=.5-1e-12 for d in dds)/128-s['halfDrawdownShare'])<1e-14;checks+=1
print(f'{checks} independent optimizer/binomial/path checks; max scaled terminal difference {maxerr:.3g}')
