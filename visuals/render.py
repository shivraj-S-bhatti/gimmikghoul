"""Generate editable concept diagrams. No model outputs or battle scores are fabricated."""
from pathlib import Path
from html import escape
import base64
OUT=Path(__file__).parent
ROOT=OUT.parent
BG='#101922'; CARD='#192630'; FG='#edf1e9'; MUT='#a7b8bb'; GOLD='#ebc66f'; TEAL='#75d8c0'; CORAL='#ef998d'; BLUE='#8fbbea'
def t(x,y,s,size=18,color=FG,weight=400):return f'<text x="{x}" y="{y}" fill="{color}" font-family="Inter,Arial,sans-serif" font-size="{size}" font-weight="{weight}">{escape(s)}</text>'
def lines(x,y,ss,size=17,color=MUT):return ''.join(t(x,y+i*(size+8),s,size,color) for i,s in enumerate(ss))
def rect(x,y,w,h,fill=CARD,stroke='#334650',r=18):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}"/>'
def edge(x1,y1,x2,y2,color=TEAL,dash=False):return f'<path d="M{x1},{y1} C{(x1+x2)/2},{y1} {(x1+x2)/2},{y2} {x2},{y2}" fill="none" stroke="{color}" stroke-width="2.5" {"stroke-dasharray=\"6 5\"" if dash else ""}/>'
def chip(x,y,s,c=TEAL,w=150):return rect(x,y,w,38,'#15242c',c,19)+t(x+13,y+25,s,15,c,600)
def mon(x,y,id,label):
 p=ROOT/'data/sprites'/f'{id}.png'
 if not p.exists(): p=p.with_suffix('.gif')
 mime='gif' if p.suffix=='.gif' else 'png'
 b=base64.b64encode(p.read_bytes()).decode()
 return f'<circle cx="{x}" cy="{y}" r="42" fill="#233540" stroke="#50616b"/><image x="{x-51}" y="{y-51}" width="102" height="102" href="data:image/{mime};base64,{b}" style="image-rendering:pixelated"/>'+t(x-48,y+65,label,15)
def canvas(title,kicker,subtitle,w=1440,h=1080):
 return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{escape(title)}"><rect width="100%" height="100%" fill="{BG}"/>'+t(52,48,kicker,14,GOLD,700)+t(52,104,title,38,FG,600)+t(52,142,subtitle,18,MUT)
def panel(x,y,n,title,sub):return rect(x,y,650,355)+t(x+25,y+40,n,15,GOLD,700)+t(x+67,y+40,title,23,FG,600)+t(x+25,y+75,sub,16,MUT)
def save(name,s): (OUT/name).write_text(s+'</svg>')
s=canvas('An overlooked core gets a job','GIMMIKGHOUL / STORYBOARD 01','BSS singles · a player and agent explore possibilities, then choose what matters.')
s+=panel(44,180,'01','Start with a question','“What would make Mega Sableye worth bringing?”')
s+=edge(181,349,464,349)+mon(181,349,'sableyemega','Mega Sableye')+chip(400,330,'A useful role',GOLD,180)
s+=lines(75,455,['Player pins a core, a format and a preference.','The agent asks which opposing plans matter.'])
s+=panel(746,180,'02','Expand mechanisms','Explore routes to the job, rather than one synergy score.')
s+=edge(856,353,1091,311)+edge(856,353,1091,389,BLUE)+mon(856,353,'slowkinggalar','Galarian Slowking')+chip(1051,289,'Handle chosen Fairy?',TEAL,230)+chip(1051,369,'Preserve momentum?',BLUE,230)
s+=lines(777,455,['A resistance suggests a candidate, not a verdict.','Inspect exact sets, recovery and switching costs.'])
s+=panel(44,563,'03','Expose the fragile premise','“What if their Fairy carries a coverage move?”')
s+=chip(78,703,'Switch-in route',TEAL,185)+edge(263,723,340,723,CORAL,True)+chip(340,703,'Coverage / chip?',CORAL,240)
s+=chip(120,773,'Alternative partner',BLUE,210)+chip(380,773,'Concede matchup',GOLD,220)
s+=lines(75,844,['Expand counterplay. Keep another route on the board.'])
s+=panel(746,563,'04','Check one decision; revise','A selected calculation or trace informs the next choice.')
s+=chip(780,702,'Exact sets + field',BLUE,210)+edge(990,721,1048,721)+chip(1048,702,'Native checker',TEAL,215)
s+=chip(780,767,'Keep',TEAL,110)+chip(906,767,'Revise',GOLD,120)+chip(1042,767,'Still unknown',CORAL,220)
s+=lines(777,844,['Retain the idea, its concessions and the reason for change.'])
s+=t(52,986,'A symbolic map for discussion. Expand details only when they can change a decision.',22,FG,500)
s+=t(52,1024,'Design storyboard · these prompts are proposed interactions, not measured matchup findings.',15,MUT)
save('storyboard-core.svg',s)
s=canvas('Follow the conditions, find another route','GIMMIKGHOUL / STORYBOARD 02','VGC doubles · explore Torterra, Mega Raichu Y and Milotic as an open team-building question.')
s+=panel(44,180,'01','Name the intended turn','“Can Torterra get a useful setup opportunity?”')
s+=mon(176,353,'torterra','Torterra')+mon(367,353,'raichumegay','Mega Raichu Y')+mon(558,353,'milotic','Milotic')
s+=lines(75,455,['The trio is a starting hypothesis.','Choose the ruleset and inspect each proposed interaction.'])
s+=panel(746,180,'02','Search across mechanisms','Generate several ways to create the same opportunity.')
s+=chip(782,302,'Redirection',TEAL,175)+chip(1000,302,'Turn order',BLUE,175)+chip(782,370,'Damage mitigation',GOLD,200)+chip(1020,370,'Force a choice',CORAL,200)
s+=lines(777,455,['Candidates differ in targeting, timing and cost.','The graph carries conditions, not a universal “protects” edge.'])
s+=panel(44,563,'03','A route needs all its premises','One route node represents a joint requirement.')
s+=chip(78,673,'Targetable move',BLUE,190)+chip(78,727,'Support acts in time',BLUE,225)+chip(78,781,'Setup survives',BLUE,190)
s+=edge(303,746,385,742)+edge(268,692,385,742)+edge(268,800,385,742)+chip(385,723,'AND → setup route',TEAL,260)
s+=lines(75,862,['Missing one premise keeps the route unresolved.'])
s+=panel(746,563,'04','Choose an informative test','Challenge the premise that could change the team.')
s+=chip(782,685,'Opponent response',CORAL,230)+edge(1012,704,1080,755,CORAL)+chip(1055,736,'Selected trace',TEAL,230)
s+=chip(782,765,'Fallback line',BLUE,220)+edge(1002,784,1055,755,BLUE)
s+=lines(777,844,['Keep the useful idea even if its first execution fails.'])
s+=t(52,986,'Agents may reason over temporary hypergraphs; the player sees a small map of meaningful choices.',21,FG,500)
s+=t(52,1024,'Design storyboard · no legality, viability or successful opening is asserted for this candidate trio.',15,MUT)
save('storyboard-routes.svg',s)
s=canvas('The intended reasoning fabric','GIMMIKGHOUL / DATA VISION','Stable mechanics, changing experience and creative theories meet in a selected decision.',1440,1120)
# layers as columns
for x,title,sub,c in [(44,'What can happen','MECHANICS',BLUE),(514,'What might work','THEORIES',GOLD),(984,'What has been seen','CONTEXT THROUGH TIME',TEAL)]:
 s+=rect(x,185,412,665)+t(x+24,225,sub,13,c,700)+t(x+24,264,title,25)
# Intercolumn edges first
s+=edge(430,422,550,422,BLUE)+edge(1010,422,898,422,TEAL)+edge(720,850,720,906,GOLD)
for y,a,b in [(303,'Species / form','Move / ability / item'),(411,'Executable effects','Targets · timing · field'),(519,'Ruleset + version','Availability · restrictions'),(627,'Exact candidate sets','Moves · investment · item')]:
 s+=chip(70,y,a,BLUE,355)+t(86,y+66,b,17,MUT)
s+=lines(70,771,['Source code and rules anchor the model.','A static edge is not a complete interaction.'],15)
for y,a,b in [(303,'Goal / role','Player preference · selected opponents'),(411,'Conditional route','Joint prerequisites → intended effect'),(519,'Alternatives / counterplay','Costs · concessions · fallback modes'),(627,'Theory revision + checks','Proposed · checked · rejected · open')]:
 s+=chip(540,y,a,GOLD,355)+t(556,y+66,b,17,MUT)
s+=lines(540,771,['A route node can encode a hyperedge.','The evaluator must enforce its conditions.'],15)
for y,a,b in [(303,'Report / video / observation','Author · locator · observed date'),(411,'Meta snapshot','Format · period · population · usage'),(519,'Claim + validity interval','Who says it? When does it apply?'),(627,'Competing interpretations','Mechanism hypothesis · missing evidence')]:
 s+=chip(1010,y,a,TEAL,355)+t(1026,y+66,b,17,MUT)
s+=lines(1010,771,['Correlation suggests directions to explore.','It does not supply a causal guarantee.'],15)
s+=rect(44,904,1352,150,'#20343b',TEAL)+t(72,943,'TASK-SPECIFIC PROJECTION',13,TEAL,700)+t(72,980,'One player question → a small human map + an agent’s working representation',24)
s+=t(72,1018,'Query a path · expand a joint condition · choose a check · revise a theory · recover a past interpretation',18,MUT)
s+=t(52,1091,'Intended model · layers can share a store; separate graphs are optional. The current implementation covers a smaller subset.',15,MUT)
save('intended-data-fabric.svg',s)
print('Wrote three editable SVG concept boards.')
