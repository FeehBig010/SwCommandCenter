"""Generate small public family/base-stat indexes from a downloaded SWARFARM fixture."""
import json,sys,hashlib
from pathlib import Path
source=Path(sys.argv[1]); records=json.loads(source.read_text()); monsters=[r['fields'] for r in records if r['model']=='bestiary.monster' and r['fields'].get('com2us_id')]
families={}; meta={}
for m in monsters:
 key=str(m.get('family_id') or m['com2us_id']//100*100)
 if not m.get('is_awakened'): families.setdefault(key,set()).add(m['name'])
for m in monsters:
 key=str(m.get('family_id') or m['com2us_id']//100*100)
 meta[str(m['com2us_id'])]={'family':key,'name':m['name'],'obtainable':m.get('obtainable',False),'base':dict(zip(['hp','atk','def','spd','cr','cd','res','acc'],[m.get('max_lvl_hp',0),m.get('max_lvl_attack',0),m.get('max_lvl_defense',0),m.get('speed',0),m.get('crit_rate',15),m.get('crit_damage',50),m.get('resistance',15),m.get('accuracy',0)]))}
out={'source':'https://raw.githubusercontent.com/swarfarm/swarfarm/master/bestiary/fixtures/bestiary_data.json','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'families':{k:sorted(v) for k,v in families.items()},'monsters':meta}
Path('src/core/monster-metadata.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
print(len(meta),'monsters;',len(families),'families;',out['sha256'])
