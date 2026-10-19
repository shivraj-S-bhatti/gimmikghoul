"""Learn the meta's plans from site/data/teams.json and score how they play against each other.

1. Dictionary learning: TF-IDF team vectors -> NMF with K sparse, non-negative features ("plans").
2. Probe: P(A beats B) = sigmoid( s.(hA - hB) + hA^T W hB ), W antisymmetric.
   s is the transitive (rating-like) part, W the cyclic (rock-paper-scissors) part.
3. Loops: positive 3-cycles in W, kept only where raw records between plan-led teams agree.
4. Map: t-SNE of plan activations, for the galaxy view.

Run: uv run --with numpy --with scikit-learn python -I meta/plans.py
"""
import json, math, itertools, os
from collections import Counter
import numpy as np
from sklearn.decomposition import NMF
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.metrics import log_loss
from sklearn.manifold import TSNE

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(ROOT + '/site/data/teams.json'))
T, EV = D['teams'], D['events']
M = np.array([m for m in D['matches'] if m[2] != 0.5])
N, K, E = len(T), 16, len(EV)

# Community names, keyed by each plan's most defining token (checked against top tokens below).
NAMES = {'mon:staraptormega': ('Staraptor Offense', 'Hyper Offense'), 'mon:grimmsnarl': ('SunRain', 'Balance'), 'mon:salamencemega': ('Mence Offense', 'Hyper Offense'),
         'mon:tyranitarmega': ('Tyranitar Sand', 'Weather'), 'mon:delphoxmega': ('Protect the Queen', 'Redirection'), 'mon:whimsicott': ('Whimsi Tailwind', 'Speed Control'),
         'mon:sylveon': ('Sylveon Chomp', 'Spread'), 'mon:farigiraf': ('Rain Room', 'Trick Room'), 'mon:indeedeef': ('Psyspam', 'Terrain Spam'), 'mon:gengarmega': ('Perish Trap', 'Gimmick'),
         'mon:floettemega': ('Petal Dragon', 'Balance'), 'set:volcarona@grassyseed': ('Weatherless Setup', 'Setup'), 'mon:froslassmega': ('Froslass Snow', 'Screens'),
         'mon:ceruledge': ('Ceruledge Milotic', 'Bulky Offense'), 'set:volcarona@rockyhelmet': ('Rage Moth', 'Redirection'), 'mon:pelipper': ('Swift Swim Rain', 'Weather')}

df = Counter(k for t in T for k in t['tok'])
VOC = sorted(k for k, c in df.items() if c >= 15)
ix = {k: j for j, k in enumerate(VOC)}
X = np.zeros((N, len(VOC)))
for n, t in enumerate(T):
    for k in t['tok']:
        if k in ix: X[n, ix[k]] = 1
Xw = X * np.array([math.log(N / df[k]) for k in VOC])
Xw /= np.linalg.norm(Xw, axis=1, keepdims=True) + 1e-9
nmf = NMF(n_components=K, init='nndsvda', random_state=0, max_iter=4000)
H = nmf.fit_transform(Xw); C = nmf.components_
H = H / (H.max(axis=0, keepdims=True) + 1e-9)
dom = H.argmax(1)

plans = []
for f in range(K):
    top = [VOC[j] for j in np.argsort(-C[f])[:14]]
    key = next((k for k in top if k in NAMES), None)
    name, tag = NAMES.get(key, (', '.join(k.split(':')[1] for k in top[:2]), 'Unlabelled'))
    plans.append({'f': f, 'name': name, 'tag': tag, 'top': top, 'mons': [k[4:] for k in top if k.startswith('mon:')][:3]})

# Probe with antisymmetric interactions.
a, b, y = M[:, 0].astype(int), M[:, 1].astype(int), M[:, 2]
pairs = [(i, j) for i in range(K) for j in range(i + 1, K)]
def design(ha, hb):
    return np.hstack([ha - hb, np.stack([ha[:, i] * hb[:, j] - ha[:, j] * hb[:, i] for i, j in pairs], 1)])
Xd = design(H[a], H[b])
cv = {}
for c in [0.03, 0.1, 0.3, 1]:
    ll = [log_loss(y[te], LogisticRegression(C=c, fit_intercept=False, max_iter=5000).fit(Xd[tr], y[tr]).predict_proba(Xd[te])[:, 1])
          for tr, te in KFold(5, shuffle=True, random_state=0).split(y)]
    cv[c] = float(np.mean(ll))
best = min(cv, key=cv.get)
model = LogisticRegression(C=best, fit_intercept=False, max_iter=5000).fit(Xd, y)
s = model.coef_[0][:K]; W = np.zeros((K, K))
for (i, j), w in zip(pairs, model.coef_[0][K:]): W[i, j], W[j, i] = w, -w
pred = cross_val_predict(LogisticRegression(C=best, fit_intercept=False, max_iter=5000), Xd, y, cv=5, method='predict_proba')[:, 1]
zt, zc = (H[a] - H[b]) @ s, np.einsum('ni,ij,nj->n', H[a], W, H[b])

# Raw records between plan-led teams, and per-event share / Day 1 win rate.
R = np.zeros((K, K, 2), int); ev = np.array([t['event'] for t in T])
for i, j, w in zip(a, b, y): R[dom[i], dom[j], 0 if w else 1] += 1; R[dom[j], dom[i], 1 if w else 0] += 1
for p in plans:
    f = p['f']; mask = dom == f
    p['share'] = [round(float((mask & (ev == e)).sum() / (ev == e).sum()), 4) for e in range(E)]
    p['day1'] = [[int(sum(T[n]['d1'][0] for n in np.where(mask & (ev == e))[0])), int(sum(T[n]['d1'][1] for n in np.where(mask & (ev == e))[0]))] for e in range(E)]
    p['strength'] = round(float(s[f]), 4)
cycles = sorted(((min(W[i, j], W[j, k], W[k, i]), i, j, k) for i, j, k in itertools.permutations(range(K), 3)
                 if i < j and i < k and W[i, j] > 0 and W[j, k] > 0 and W[k, i] > 0), reverse=True)
loops = [{'plans': [i, j, k], 'records': [R[i, j].tolist(), R[j, k].tolist(), R[k, i].tolist()]} for _, i, j, k in cycles
         if all(R[x, y_, 0] > R[x, y_, 1] for x, y_ in ((i, j), (j, k), (k, i)))][:4]

Y = TSNE(n_components=2, perplexity=40, random_state=0, init='pca').fit_transform(H / (np.linalg.norm(H, axis=1, keepdims=True) + 1e-9))
Y = (Y - Y.min(0)) / (Y.max(0) - Y.min(0))

out = {'K': K, 'plans': plans, 'W': W.round(4).tolist(), 'raw': R.tolist(), 'loops': loops,
       'probe': {'cv_logloss': {str(k): round(v, 5) for k, v in cv.items()}, 'coin_logloss': round(math.log(2), 5), 'C': best,
                 'cv_accuracy': round(float(((pred > .5) == (y == 1)).mean()), 4)},
       'decomposition': {'transitive_var': round(float(zt.var()), 5), 'cyclic_var': round(float(zc.var()), 5),
                         'cyclic_share': round(float(zc.var() / (zt.var() + zc.var())), 4)},
       'map': [[round(float(Y[n, 0]), 3), round(float(Y[n, 1]), 3), int(dom[n]), int(ev[n])] for n in range(N)]}
json.dump(out, open(ROOT + '/site/data/plans.json', 'w'), separators=(',', ':'))
print('cv accuracy', out['probe']['cv_accuracy'], '| cyclic share', out['decomposition']['cyclic_share'])
for p in plans: print(f"{p['f']:2d} {p['name']:20s} s={p['strength']:+.2f} share {p['share']} top {p['top'][:3]}")
print('loops', [[plans[x]['name'] for x in l['plans']] for l in loops])
