export async function runBatch(fn){
 try{
  let raw='';for await(const part of process.stdin)raw+=part;
  const input=JSON.parse(raw),rows=Array.isArray(input)?input:Array.isArray(input?.rows)?input.rows:[input];
  if(rows.length>500)throw Error('Maximum 500 rows per batch');
  process.stdout.write(JSON.stringify({results:rows.map(fn)},null,2)+'\n');
 }catch(e){process.stderr.write(e.message+'\n');process.exitCode=2;}
}
