/**
 * Composes Ukrainian names for long, regular Human Atlas terms
 * ("lateral branch of anterior basal segmental artery") from a small
 * vocabulary. English "A of B of C" becomes "A B(gen) C(gen)": adjectives and
 * nouns are inflected for gender, number and (nominative | genitive) case.
 * A name with any unknown word is not composed (the caller falls back to
 * English) so a half-translated mixture never appears.
 */

type Gender = 'm' | 'f' | 'n' | 'p';
type Noun = { nom: string; gender: Gender; gen: string };

// noun: english = називний | рід(m,f,n,p) | родовий
const NOUN_SOURCE = `
artery = артерія|f|артерії
arteries = артерії|p|артерій
vein = вена|f|вени
veins = вени|p|вен
branch = гілка|f|гілки
branches = гілки|p|гілок
tributary = притока|f|притоки
tributaries = притоки|p|приток
segment = сегмент|m|сегмента
segments = сегменти|p|сегментів
tree = дерево|n|дерева
subdivision = підрозділ|m|підрозділу
organ = орган|m|органа
organs = органи|p|органів
trunk = стовбур|m|стовбура
muscle = м'яз|m|м'яза
wall = стінка|f|стінки
zone = зона|f|зони
part = частина|f|частини
parts = частини|p|частин
region = ділянка|f|ділянки
set = група|f|групи
system = система|f|системи
lobe = частка|f|частки
ventricle = шлуночок|m|шлуночка
atrium = передсердя|n|передсердя
compartment = відділ|m|відділу
head = голова|f|голови
component = компонент|m|компонента
content = вміст|m|вмісту
nose = ніс|m|носа
chest = грудна клітка|f|грудної клітки
mediastinum = середостіння|n|середостіння
layer = шар|m|шару
nerve = нерв|m|нерва
skeleton = скелет|m|скелета
finger = палець кисті|m|пальця кисті
foot = стопа|f|стопи
hand = кисть|f|кисті
body = тіло|n|тіла
ligament = зв'язка|f|зв'язки
matter = речовина|f|речовини
cavity = порожнина|f|порожнини
limb = кінцівка|f|кінцівки
arch = дуга|f|дуги
eyeball = очне яблуко|n|очного яблука
valve = клапан|m|клапана
anastomosis = анастомоз|m|анастомозу
cluster = скупчення|n|скупчення
division = відділ|m|відділу
liver = печінка|f|печінки
duct = протока|f|протоки
tissue = тканина|f|тканини
space = простір|m|простору
ganglion = ганглій|m|ганглія
septum = перегородка|f|перегородки
brain = мозок|m|мозку
mouth = ротова порожнина|f|ротової порожнини
intestine = кишка|f|кишки
musculature = мускулатура|f|мускулатури
myocardium = міокард|m|міокарда
fascia = фасція|f|фасції
sector = сектор|m|сектора
subsector = субсектор|m|субсектора
gyrus = звивина|f|звивини
aorta = аорта|f|аорти
chamber = камера|f|камери
penis = статевий член|m|статевого члена
forearm = передпліччя|n|передпліччя
arm = плече|n|плеча
leg = гомілка|f|гомілки
thigh = стегно|n|стегна
neck = шия|f|шиї
thorax = грудна клітка|f|грудної клітки
abdomen = живіт|m|живота
pelvis = таз|m|таза
lung = легеня|f|легені
heart = серце|n|серця
kidney = нирка|f|нирки
stomach = шлунок|m|шлунка
spleen = селезінка|f|селезінки
pancreas = підшлункова залоза|f|підшлункової залози
gallbladder = жовчний міхур|m|жовчного міхура
bladder = міхур|m|міхура
colon = ободова кишка|f|ободової кишки
ileum = клубова кишка|f|клубової кишки
jejunum = порожня кишка|f|порожньої кишки
duodenum = дванадцятипала кишка|f|дванадцятипалої кишки
rectum = пряма кишка|f|прямої кишки
esophagus = стравохід|m|стравоходу
larynx = гортань|f|гортані
pharynx = глотка|f|глотки
trachea = трахея|f|трахеї
bronchus = бронх|m|бронха
skin = шкіра|f|шкіри
bone = кістка|f|кістки
cartilage = хрящ|m|хряща
membrane = мембрана|f|мембрани
joint = суглоб|m|суглоба
tendon = сухожилля|n|сухожилля
node = вузол|m|вузла
plexus = сплетення|n|сплетення
sinus = пазуха|f|пазухи
ring = кільце|n|кільця
network = сітка|f|сітки
circle = коло|n|кола
junction = з'єднання|n|з'єднання
line = лінія|f|лінії
boundary = межа|f|межі
entity = утвір|m|утвору
structure = структура|f|структури
tract = тракт|m|тракту
apparatus = апарат|m|апарата
portion = ділянка|f|ділянки
side = сторона|f|сторони
level = рівень|m|рівня
sulcus = борозна|f|борозни
lobule = часточка|f|часточки
hemisphere = півкуля|f|півкулі
cortex = кора|f|кори
nucleus = ядро|n|ядра
capsule = капсула|f|капсули
commissure = спайка|f|спайки
decussation = перехрест|m|перехресту
fornix = склепіння|n|склепіння
cusp = стулка|f|стулки
leaflet = стулка|f|стулки
leaf = стулка|f|стулки
papillary muscle = сосочковий м'яз|m|сосочкового м'яза
girdle = пояс|m|пояса
shoulder = плече|n|плеча
knee = коліно|n|коліна
cecum = сліпа кишка|f|сліпої кишки
appendix = апендикс|m|апендикса
peritoneum = очеревина|f|очеревини
perineum = промежина|f|промежини
tongue = язик|m|язика
tooth = зуб|m|зуба
hair = волосся|n|волосся
hairs = волосся|n|волосся
eyelid = повіка|f|повіки
orbit = очна ямка|f|очної ямки
ear = вухо|n|вуха
eye = око|n|ока
lens = кришталик|m|кришталика
retina = сітківка|f|сітківки
cornea = рогівка|f|рогівки
iris = райдужка|f|райдужки
sclera = склера|f|склери
diencephalon = проміжний мозок|m|проміжного мозку
telencephalon = кінцевий мозок|m|кінцевого мозку
midbrain = середній мозок|m|середнього мозку
hindbrain = задній мозок|m|заднього мозку
forebrain = передній мозок|m|переднього мозку
neuraxis = нервова вісь|f|нервової осі
hypothalamus = гіпоталамус|m|гіпоталамуса
thalamus = таламус|m|таламуса
cerebellum = мозочок|m|мозочка
mater = оболонка|f|оболонки
dura mater = тверда мозкова оболонка|f|твердої мозкової оболонки
dura = тверда оболонка|f|твердої оболонки
tectum = покрив|m|покриву
vena cava = порожниста вена|f|порожнистої вени
cava = порожниста вена|f|порожнистої вени
thyroid = щитоподібна залоза|f|щитоподібної залози
gland = залоза|f|залози
pulp = пульпа|f|пульпи
disk = диск|m|диска
symphysis = симфіз|m|симфіза
back = спина|f|спини
dorsum = тил|m|тилу
bundle = пучок|m|пучка
ring finger = безіменний палець|m|безіменного пальця
index finger = вказівний палець|m|вказівного пальця
middle finger = середній палець|m|середнього пальця
little finger = мізинець кисті|m|мізинця кисті
big toe = великий палець стопи|m|великого пальця стопи
chest wall = стінка грудної клітки|f|стінки грудної клітки
bile duct = жовчна протока|f|жовчної протоки
lamina = пластинка|f|пластинки
stria = смужка|f|смужки
brachium = ручка|f|ручки
peduncle = ніжка|f|ніжки
curtain = завіса|f|завіси
incisure = вирізка|f|вирізки
root = корінь|m|кореня
vasculature = судинна система|f|судинної системи
parenchyma = паренхіма|f|паренхіми
sac = мішок|m|мішка
mesentery = брижа|f|брижі
appendage = придаток|m|придатка
vessel = судина|f|судини
epidermis = епідерміс|m|епідермісу
epithelium = епітелій|m|епітелію
laryngopharynx = гортанна частина глотки|f|гортанної частини глотки
continuity = безперервність|f|безперервності
process = відросток|m|відростка
palate = піднебіння|n|піднебіння
arteria = артерія|f|артерії
face = обличчя|n|обличчя
neuraxis = нервова вісь|f|нервової осі
joint = суглоб|m|суглоба
vermis = черв|m|черва
complex = комплекс|m|комплексу
`;

// adjective: english = чоловічий називний (-ий / -ій)
const ADJ_SOURCE = `
superior = верхній
inferior = нижній
anterior = передній
posterior = задній
lateral = бічний
medial = присередній
middle = середній
basal = базальний
internal = внутрішній
external = зовнішній
deep = глибокий
superficial = поверхневий
common = загальний
palmar = долонний
plantar = підошвовий
digital = пальцевий
dorsal = тильний
proper = власний
bronchial = бронхіальний
coronary = вінцевий
portal = воротний
biliary = жовчний
hepatic = печінковий
cerebral = мозковий
pulmonary = легеневий
systemic = системний
arterial = артеріальний
venous = венозний
subsegmental = субсегментарний
segmental = сегментарний
interventricular = міжшлуночковий
renal = нирковий
apical = верхівковий
iliac = клубовий
bronchopulmonary = бронхолегеневий
femoral = стегновий
circumflex = огинальний
genicular = колінний
cardiac = серцевий
tibial = великогомілковий
ventricular = шлуночковий
mesenteric = брижовий
thoracic = грудний
cerebellar = мозочковий
temporal = скроневий
ulnar = ліктьовий
upper = верхній
lower = нижній
brachial = плечовий
hepatovenous = печінково-венозний
pancreaticoduodenal = підшлунково-дванадцятипалий
occipital = потиличний
colic = ободовокишковий
radial = променевий
lobar = частковий
ileocolic = клубово-ободовокишковий
intercostal = міжреберний
lingular = язичковий
subclavian = підключичний
thoraco-acromial = грудо-акроміальний
choroidal = судинний
interosseous = міжкістковий
recurrent = зворотний
pancreatic = підшлунковий
carotid = сонний
epigastric = надчеревний
pectoral = грудний
vascular = судинний
communicating = сполучний
callosomarginal = мозолисто-крайовий
second = другий
first = перший
third = третій
fourth = четвертий
axillary = пахвовий
nasal = носовий
pontine = мостовий
cardinal = основний
caudate = хвостатий
scapular = лопатковий
cervical = шийний
extrinsic = зовнішній
intrinsic = власний
descending = низхідний
ascending = висхідний
metacarpal = п'ястковий
metatarsal = плесновий
septal = перегородковий
free = вільний
gray = сірий
great = великий
pudendal = соромітний
intrapulmonary = внутрішньолегеневий
marginal = крайовий
popliteal = підколінний
white = білий
small = малий
large = великий
splenic = селезінковий
investing = покривний
abdominal = черевний
humeral = плечовий
parietal = тім'яний
central = центральний
apicoposterior = верхівково-задній
lumbar = поперековий
brachiocephalic = плечоголовний
ciliary = війковий
cranial = черепний
frontal = лобовий
oculomotor = окоруховий
pericallosal = навколомозолистий
vertebral = хребтовий
cartilaginous = хрящовий
parasympathetic = парасимпатичний
perforating = прободний
gastroduodenal = шлунково-дванадцятипалий
saphenous = підшкірний
ileal = клубовокишковий
phrenic = діафрагмовий
suprarenal = наднирковий
terminal = кінцевий
connective = сполучний
lacrimal = слізний
tarsal = передплесновий
lobular = часточковий
median = серединний
membranous = перетинчастий
myocardial = міокардіальний
orbital = орбітальний
osseous = кістковий
bony = кістковий
secondary = вторинний
skeletal = скелетний
nervous = нервовий
subscapular = підлопатковий
variant = варіантний
accessory = додатковий
hemiazygos = напівнепарний
azygos = непарний
cecal = сліпокишковий
suboccipital = підпотиличний
anterolateral = передньобічний
posteromedial = задньо-присередній
inferomedial = нижньо-присередній
antero-medial = передньо-присередній
basilar = базилярний
basilic = базилікальний
cavernous = печеристий
cavitated = порожнистий
celiac = черевний
costocervical = реберно-шийний
distal = дистальний
proximal = проксимальний
carpal = зап'ястковий
fibrous = фіброзний
mitral = мітральний
gastric = шлунковий
heterogeneous = неоднорідний
hypothalamic = гіпоталамічний
gluteal = сідничний
inflow = вхідний
outflow = вихідний
intermediate = проміжний
jugular = яремний
frontobasal = лобово-базальний
little = мала
sacral = крижовий
sigmoid = сигмоподібний
musculophrenic = м'язово-діафрагмовий
neural = нервовий
obturator = затульний
peritoneal = очеревинний
pre-hepatic = передпечінковий
subcostal = підреберний
caval = порожнистий
thyrocervical = щитошийний
transverse = поперечний
rectal = прямокишковий
suprascapular = надлопатковий
testicular = яєчковий
thoracodorsal = грудоспинний
subsuperior = підверхній
acromial = акроміальний
anal = анальний
appendicular = апендикулярний
arcuate = дугоподібний
aortic = аортальний
articular = суглобовий
cephalic = головний
caudal = хвостовий
cardiovascular = серцево-судинний
circumventricular = навколошлуночковий
corticomedullary = кірково-мозковий
cuneiform = клиноподібний
diagonal = діагональний
dorsalis = тильний
esophageal = стравохідний
extrahepatic = позапечінковий
intrahepatic = внутрішньопечінковий
faucial = зівний
fibular = малогомілковий
gastro-epiploic = шлунково-сальниковий
gastroepiploic = шлунково-сальниковий
ii = II
iii = III
iv = IV
v = V
vi = VI
vii = VII
viii = VIII
ix = IX
iliolumbar = клубово-поперековий
immaterial = нематеріальний
infrahyoid = підпід'язиковий
insular = острівцевий
intermediomedial = проміжно-присередній
intracranial = внутрішньочерепний
irregular = неправильний
laterobasal = бічно-базальний
loose = пухкий
mandibular = нижньощелепний
maxillary = верхньощелепний
antebrachial = передпліччевий
cubital = ліктьовий
mediobasal = присередньо-базальний
mucoid = слизовий
respiratory = дихальний
tricuspid = тристулковий
trigeminal = трійчастий
precentral = передцентральний
postcentral = післяцентральний
angular = кутовий
basicranial = основний черепний
spinal = спинномозковий
subarachnoid = підпавутинний
hollow = порожнистий
human = людський
thyroid = щитоподібний
ophthalmic = очний
nasociliary = носовово-війковий
postcommunicating = післясполучний
sphenoid = клиноподібний
tracheobronchial = трахеобронхіальний
tectal = покривний
pharyngeal = глотковий
vertical = вертикальний
oblique = косий
straight = прямий
longitudinal = поздовжній
circular = циркулярний
medullary = мозковий
splenius = ремінний
sacral = крижовий
coccygeal = куприковий
cutaneous = шкірний
subcutaneous = підшкірний
mammary = грудної залози
axial = осьовий
appendicular = апендикулярний
sensory = чутливий
anatomical = анатомічний
physical = фізичний
material = матеріальний
solid = солідний
parenchymatous = паренхіматозний
nonparenchymatous = непаренхіматозний
nonskeletal = нескелетний
cell = клітинний
polar = полярний
supreme = найвищий
subendocardial = субендокардіальний
auriculotemporal = вушно-скроневий
collateral = колатеральний
paracentral = навколоцентральний
precuneal = передклиновидний
temporo-occipital = скронево-потиличний
thalamogeniculate = таламоколінчастий
thalamoperforating = таламоперфорантний
prefrontal = префронтальний
splenial = валиковий
conus = конусний
ureteric = сечовідний
calcaneal = п'ятковий
oesophageal = стравохідний
coeliac = черевний
vermian = червовий
precommunicating = передсполучний
body = тілесний
bone = кістковий
cartilage = хрящовий
muscle = м'язовий
ligament = зв'язковий
membrane = мембранний
organ = органний
tree = деревоподібний
lobe = частковий
facial = лицевий
oral = ротовий
chest = грудний
upper-lobe = верхньочастковий
rib = реберний
caval = порожнистий
motor = руховий
`;

const nouns = new Map<string, Noun>();
for (const line of NOUN_SOURCE.split('\n')) {
  const cut = line.indexOf(' = ');
  if (cut < 0) continue;
  const [nom, gender, gen] = line.slice(cut + 3).split('|');
  if (nom && gender && gen) nouns.set(line.slice(0, cut).trim(), { nom, gender: gender as Gender, gen });
}
const adjectives = new Map<string, string>();
for (const line of ADJ_SOURCE.split('\n')) {
  const cut = line.indexOf(' = ');
  if (cut > 0) adjectives.set(line.slice(0, cut).trim(), line.slice(cut + 3).trim());
}

type Case = 'nom' | 'gen';

function adjective(masculine: string, gender: Gender, grammaticalCase: Case): string {
  if (/^[IVX]+$/.test(masculine)) return masculine;
  const soft = masculine.endsWith('ій');
  const stem = masculine.endsWith('ий') || soft ? masculine.slice(0, -2) : null;
  if (stem === null) return masculine; // invariant / unrecognised ending
  if (grammaticalCase === 'nom') {
    if (gender === 'm') return masculine;
    if (gender === 'f') return stem + (soft ? 'я' : 'а');
    if (gender === 'n') return stem + (soft ? 'є' : 'е');
    return stem + 'і';
  }
  if (gender === 'm' || gender === 'n') return stem + (soft ? 'ього' : 'ого');
  if (gender === 'f') return stem + (soft ? 'ьої' : 'ої');
  return stem + (soft ? 'іх' : 'их');
}

function nounPhrase(input: string[], grammaticalCase: Case): string | null {
  let words = input;
  let numeral = '';
  const last = words[words.length - 1];
  if (words.length > 1 && last && (/^\d+$/.test(last) || /^(ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(last))) {
    numeral = ' ' + last.toUpperCase();
    words = words.slice(0, -1);
  }
  if (!words.length) return null;
  let take = 1;
  if (words.length >= 2 && nouns.has(words.slice(-2).join(' '))) take = 2;
  const head = nouns.get(words.slice(-take).join(' '));
  if (!head) return null;
  const parts: string[] = [];
  for (const word of words.slice(0, words.length - take)) {
    const masculine = adjectives.get(word);
    if (!masculine) return null;
    parts.push(adjective(masculine, head.gender, grammaticalCase));
  }
  parts.push(grammaticalCase === 'nom' ? head.nom : head.gen);
  return parts.join(' ') + numeral;
}

/** Returns a composed Ukrainian name, or null when any word is unknown. */
export function composeName(key: string): string | null {
  key = key.replace(/\s*\(in[- ]vivo\)/, '');
  if (!/^[a-z0-9' -]+$/.test(key)) return null;
  const chunks = key.split(' of ');
  const out: string[] = [];
  for (const [index, chunk] of chunks.entries()) {
    const words = chunk.split(' ').filter(Boolean);
    const phrase = nounPhrase(words, index === 0 ? 'nom' : 'gen');
    if (!phrase) return null;
    out.push(phrase);
  }
  const text = out.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
