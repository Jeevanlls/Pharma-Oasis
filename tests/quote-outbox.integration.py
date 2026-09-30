"""Exercise the queue's real SQL on the existing, isolated website rehearsal branch.
No emails, production writes, historical quote changes or app startup.
Usage: python tests/quote-outbox.integration.py /private/rehearsal-connection.txt
"""
import concurrent.futures, json, pathlib, re, sys, time, urllib.request, urllib.parse, urllib.error

connection=pathlib.Path(sys.argv[1]).read_text().strip()
host=urllib.parse.urlparse(connection).hostname
assert host=='ep-wandering-rice-abq0zldm-pooler.eu-west-2.aws.neon.tech', 'Only the isolated website rehearsal endpoint is permitted'
schema='codex_quote_mail_rehearsal_'+str(time.time_ns())
source=pathlib.Path('server/quote-outbox-sql.ts').read_text()
statements={key:sql for key,sql in re.findall(r'export const (\w+) = `([^`]+)`;',source)}

def request(payload):
    req=urllib.request.Request('https://'+host+'/sql',data=json.dumps(payload).encode(),headers={
      'Content-Type':'application/json','Neon-Connection-String':connection,
      'Neon-Raw-Text-Output':'true','Neon-Array-Mode':'false',
      'Neon-Batch-Isolation-Level':'Serializable'})
    try:
        with urllib.request.urlopen(req,timeout=60) as r:return json.load(r)
    except urllib.error.HTTPError as e:
        body=json.loads(e.read())
        raise RuntimeError(body.get('code','SQL_ERROR')) from None

def tx(queries):
    return request({'queries':[{'query':sql,'params':params} for sql,params in queries]})['results']

def run(sql,params=None):
    return request({'query':sql,'params':params or []})

def queue(name):
    # SET LOCAL keeps the original SQL unchanged and scopes every operation to fixtures.
    return f'SET LOCAL search_path TO {schema}', statements[name]

def scoped(name,params=None):
    setup,sql=queue(name)
    return tx([(setup,[]),(sql,params or [])])[-1]

run(f'CREATE SCHEMA {schema}')
tx([(f'SET LOCAL search_path TO {schema}',[]),
    ('CREATE TABLE quotes (id integer PRIMARY KEY)',[]),
    (statements['quoteOutboxDdl'],[]),
    ('CREATE TABLE quote_items (quote_id integer REFERENCES quotes(id), quantity integer NOT NULL)',[]),
    ('INSERT INTO quotes VALUES (1),(2)',[]),
    ("INSERT INTO quote_email_outbox(quote_id,audience) VALUES (1,'sales'),(1,'customer')",[])])
checks={}
try:
    tx([(f'SET LOCAL search_path TO {schema}',[]),
        ('INSERT INTO quotes VALUES (3)',[]),
        ("INSERT INTO quote_email_outbox(quote_id,audience) VALUES (3,'sales')",[]),
        ('INSERT INTO quote_items VALUES (3,NULL)',[])])
    raise AssertionError('Invalid line unexpectedly committed')
except RuntimeError as e: assert str(e)=='23502'
assert run(f'SELECT count(*) n FROM {schema}.quotes WHERE id=3')['rows'][0]['n']=='0'
assert run(f'SELECT count(*) n FROM {schema}.quote_email_outbox WHERE quote_id=3')['rows'][0]['n']=='0'
checks['failed_line_rolls_back_quote_and_email_job']=True
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    claimed=list(pool.map(lambda _: scoped('claimQuoteEmailSql')['rows'],range(2)))
assert len(claimed[0])==len(claimed[1])==1
assert claimed[0][0]['id']!=claimed[1][0]['id']
checks['concurrent_workers_claim_different_jobs']=True
assert not scoped('claimQuoteEmailSql')['rows']
checks['active_lease_prevents_duplicate_claim']=True
job=claimed[0][0]
run(f"UPDATE {schema}.quote_email_outbox SET locked_until=now()-interval '1 minute' WHERE id=$1",[job['id']])
recovered=scoped('claimQuoteEmailSql')['rows'][0]
assert recovered['id']==job['id'] and recovered['attempts']=='2'
checks['interrupted_worker_job_is_recovered']=True
assert scoped('completeQuoteEmailSql',[job['id'],1,'sent',None,0])['rowCount']==0
checks['stale_worker_cannot_finish_reclaimed_job']=True
assert scoped('completeQuoteEmailSql',[job['id'],2,'sent',None,0])['rowCount']==1
other=claimed[1][0]
scoped('completeQuoteEmailSql',[other['id'],1,'failed','Simulated failure',0])
# Set the sales job failed, retry twice, and prove only one queue record exists.
run(f"UPDATE {schema}.quote_email_outbox SET status='failed' WHERE quote_id=1 AND audience='sales'")
assert len(scoped('retrySalesQuoteEmailSql',[1])['rows'])==1
assert len(scoped('retrySalesQuoteEmailSql',[1])['rows'])==0
assert run(f"SELECT count(*) n FROM {schema}.quote_email_outbox WHERE quote_id=1 AND audience='sales'")['rows'][0]['n']=='1'
checks['repeated_admin_retry_does_not_duplicate_jobs']=True
run(f"UPDATE {schema}.quote_email_outbox SET status='sent' WHERE quote_id=1 AND audience='sales'")
assert len(scoped('retrySalesQuoteEmailSql',[1])['rows'])==0
checks['sent_notification_cannot_be_accidentally_requeued']=True
run(f"UPDATE {schema}.quote_email_outbox SET status='sending',attempts=6,locked_until=now()-interval '1 minute' WHERE quote_id=1 AND audience='customer'")
scoped('exhaustQuoteEmailSql')
assert run(f"SELECT status FROM {schema}.quote_email_outbox WHERE quote_id=1 AND audience='customer'")['rows'][0]['status']=='failed'
checks['final_interrupted_attempt_requires_review']=True
print(json.dumps({'passed':True,'checks':checks,'scope':schema,'production_changed':False,'emails_sent':0},indent=2))
