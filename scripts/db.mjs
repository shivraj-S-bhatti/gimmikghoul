import {createClient} from 'redis';
export async function connect() {
  const client=createClient({url:process.env.GRAPH_URL || 'redis://127.0.0.1:6388',socket:{connectTimeout:5000,reconnectStrategy:false}});
  client.on('error',()=>{});
  await client.connect();
  return client;
}
export async function query(client, graph, cypher, parameters={}) {
  const literal=value=>{
    if (Array.isArray(value)) return '['+value.map(literal).join(',')+']';
    if (value && typeof value==='object') return '{'+Object.entries(value).map(([k,v])=>`\`${k.replaceAll('`','``')}\`:${literal(v)}`).join(',')+'}';
    return JSON.stringify(value);
  };
  const prefix=Object.entries(parameters).map(([k,v])=>`${k}=${literal(v)}`).join(' ');
  return client.sendCommand(['GRAPH.QUERY',graph,`${prefix?'CYPHER '+prefix+' ':''}${cypher}`,'--compact']);
}
export function rows(result) {
  return (result[1] || []).map(row=>row.map(cell=>cell[1]));
}
