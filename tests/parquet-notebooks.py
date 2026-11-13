"""Offline scientific-example validation. No real observations or network reads.

See docs/parquet-access.md for the isolated test environment.
"""
from pathlib import Path
from datetime import datetime, timezone
import copy, hashlib, io, json, os, shutil, sys, tempfile
from jupyter_client import KernelManager
from jupyter_client.kernelspec import KernelSpecManager
import nbformat
from nbclient import NotebookClient
import pyarrow as pa
import pyarrow.parquet as pq

root = Path(tempfile.mkdtemp(prefix='odin-parquet-notebook-checks-'))
root.mkdir(exist_ok=True)
assets = Path(__file__).resolve().parents[1] / 'public' / 'parquet'
kernel_dir = root / 'kernels' / 'odin-parquet-test'
kernel_dir.mkdir(parents=True)
(kernel_dir / 'kernel.json').write_text(json.dumps({
    'argv': [sys.executable, '-m', 'ipykernel_launcher', '-f', '{connection_file}'],
    'display_name': 'Odin Parquet offline tests', 'language': 'python',
}))
base = root / 'fixtures'
base.mkdir(exist_ok=True)
times = [datetime(2020,1,1,tzinfo=timezone.utc)]*2 + [datetime(2020,1,2,tzinfo=timezone.utc)]*2
l2 = pa.table({'scan_id':[1001,1001,1002,1002], 'altitude':[10000.,20000.,10000.,20000.], 'vmr':[1e-6,None,2e-6,3e-6], 'temperature':[250.,240.,249.,239.], 'meas_response':[0.9,0.8,None,0.9], 'error_noise':[1e-7,None,2e-7,2e-7], 'time':pa.array(times,type=pa.timestamp('ns',tz='UTC')), 'lat_1d':[10.,10.,-20.,-20.]})
scan_diag = pa.table({'scan_id':[1001], 'stw':[[2001,2002]], 'fit_spectrum':[[[1.,None,3.],[4.,5.,6.]]], 'processing_error':[False]})
stw_diag = pa.table({'scan_id':[1001,1001], 'stw':[2002,2001], 'fit_spectrum':[[4.,5.,6.],[1.,None,3.]], 'processing_error':[False,False]})
failed_diag = pa.table({'scan_id':[1001], 'stw':pa.array([None],type=pa.list_(pa.int64())), 'fit_spectrum':pa.array([None],type=pa.list_(pa.list_(pa.float64()))), 'processing_error':[True]})
units = {'altitude':'m','vmr':'mol mol-1','temperature':'K','meas_response':'1','error_noise':'mol mol-1','lat_1d':'degrees_north','time':'UTC','fit_spectrum':'K'}

def selection(table, name, level):
    path=base/f'{name}.parquet'; pq.write_table(table,path)
    data=path.read_bytes(); sha=hashlib.sha256(data).hexdigest()
    return {'schema_version':1, 'release':{'id':'synthetic-test-only','title':'Synthetic test only','published_at':'2026-11-13','license':{'name':'Synthetic fixture only','url':'https://fixtures.invalid/license'},'citation':'Synthetic fixture; not Odin observations','documentation_url':'https://fixtures.invalid/docs'}, 'dataset':{'id':name,'title':name,'level':level,'project':'synthetic-project','product':name,'frequency_mode':1,'inversion_mode':'stnd','schema_url':'https://fixtures.invalid/schema','description':'Synthetic test only','notes':[], 'columns':[{'name':f.name,'type':str(f.type),'description':'Synthetic fixture', **({'unit':units[f.name]} if f.name in units else {})} for f in table.schema]},'files':[{'url':f'https://fixtures.invalid/{name}.parquet','sha256':sha,'size_bytes':len(data),'row_count':len(table),'observation_start':'2020-01-01','observation_end':'2020-01-02'}]}
l2sel=selection(l2,'l2','L2')
scan_sel=selection(scan_diag,'scan-diagnostics','L2I')
stw_sel=selection(stw_diag,'stw-diagnostics','L2I')
failed_sel=selection(failed_diag,'failed-diagnostics','L2I')

def prepare(name, selections):
    work=root/name; work.mkdir(exist_ok=True); cache=work/'odin-parquet-cache'; cache.mkdir(exist_ok=True)
    for filename, sel in selections.items():
        (work/filename).write_text(json.dumps(sel)+'\n')
        for f in sel['files']:
            source=base/(sel['dataset']['id']+'.parquet')
            shutil.copyfile(source,cache/(f['sha256']+'.parquet'))
    return work

def execute(name, variant, selections, kernel=False):
    work=prepare(variant,selections)
    nb=nbformat.read(assets/(name+'.ipynb'),as_version=4); nbformat.validate(nb)
    if kernel:
        manager = KernelManager(kernel_name='odin-parquet-test', kernel_spec_manager=KernelSpecManager(kernel_dirs=[str(kernel_dir.parent)], ensure_native_kernel=False))
        NotebookClient(nb, timeout=60, km=manager, resources={'metadata':{'path':str(work)}}).execute()
        nbformat.write(nb,work/'executed.ipynb')
    else:
        env={}; old=os.getcwd(); os.chdir(work)
        try:
            for cell in nb.cells:
                if cell.cell_type=='code': exec(compile(cell.source,f'{name}.ipynb','exec'),env)
        finally: os.chdir(old)
        return env,work
    return None,work

for name in ['first-profile','coverage','diagnostics']:
    sels={'selection.json':l2sel}
    if name=='diagnostics': sels['diagnostics-selection.json']=scan_sel
    _,work=execute(name,name,sels,kernel=True)
    assert list(work.glob('*.png')), name
    for receipt in work.glob('*provenance.json'):
        value=json.loads(receipt.read_text()); assert value['template_version']; assert value['analysis']; assert value['selection_source']['sha256']
    print('PASS notebook kernel:',name)
for variant,diag in [('stw-layout',stw_sel),('failed-diagnostics',failed_sel)]:
    env,work=execute('diagnostics',variant,{'selection.json':l2sel,'diagnostics-selection.json':diag})
    assert env['diagnostic_layout']==('stw-row' if variant=='stw-layout' else 'unavailable')
    assert env['plotted_stw']==(2001 if variant=='stw-layout' else None)
    print('PASS diagnostic case:',variant)

# Validation/failure checks reuse helper definitions without network reads.
env,work=execute('first-profile','helper-tests',{'selection.json':l2sel})
for invalid_url in ['http://fixtures.invalid/data.parquet','https://user:secret@fixtures.invalid/data.parquet','https://fixtures.invalid/data.parquet?token=x']:
    bad=copy.deepcopy(l2sel); bad['files'][0]['url']=invalid_url
    (work/'bad.json').write_text(json.dumps(bad))
    try: env['read_selection'](str(work/'bad.json'))
    except ValueError: pass
    else: raise AssertionError('invalid URL accepted')
from urllib.request import Request
for redirect in ['http://fixtures.invalid/data.parquet','https://user:secret@fixtures.invalid/data.parquet']:
    try: env['HTTPSRedirects']().redirect_request(Request('https://fixtures.invalid/a'),None,302,'Found',{},redirect)
    except ValueError: pass
    else: raise AssertionError('unsafe redirect accepted')
# Existing corrupt cache must fail rather than silently re-download or skip.
old=os.getcwd(); os.chdir(work)
try:
    cache=Path('odin-parquet-cache')/(l2sel['files'][0]['sha256']+'.parquet')
    cache.write_bytes(b'corrupt')
    try: env['verified_files'](l2sel)
    except ValueError: pass
    else: raise AssertionError('checksum mismatch accepted')
finally: os.chdir(old)
print('PASS invalid URLs, redirects and checksum failure')
# Exercise bounded full-file download using an in-memory HTTPS response.
class Response(io.BytesIO):
    url = "https://fixtures.invalid/l2.parquet"
class Opener:
    def __init__(self, payload): self.payload = payload; self.calls = 0
    def open(self, url, timeout):
        assert url == Response.url and timeout == 60
        self.calls += 1
        return Response(self.payload)
old=os.getcwd(); os.chdir(work)
try:
    cache.unlink()
    opener=Opener((base/'l2.parquet').read_bytes())
    env['https_opener']=opener
    paths=env['verified_files'](l2sel)
    assert len(paths)==1 and opener.calls==1
    env['verified_files'](l2sel)
    assert opener.calls==1, 'verified cache should not download again'
    cache.unlink()
    env['https_opener']=Opener((base/'l2.parquet').read_bytes()+b'extra')
    try: env['verified_files'](l2sel)
    except ValueError: pass
    else: raise AssertionError('oversized response accepted')
    assert not cache.exists() and not list(Path('odin-parquet-cache').glob('*.part'))
finally: os.chdir(old)
print('PASS bounded download, cache reuse and oversized-response cleanup')
print('ALL NOTEBOOK CHECKS PASSED; artifacts:', root)
