export type SystemId = 'skeletal'|'muscular'|'arterial'|'venous'|'nervous'|'digestive'|'respiratory'|'urinary'|'reproductive'|'lymphatic'|'endocrine'|'integumentary'|'connective'|'sensory'|'cardiac';
export const SYSTEMS: {id:SystemId;name:string;color:string;description:string}[] = [
 {id:'skeletal',name:'Скелет',color:'#e2d9ba',description:'Кістки формують опорний каркас тіла, захищають органи й слугують точками прикріплення м’язів. Їхня внутрішня тканина також накопичує мінерали та утворює клітини крові.'},
 {id:'muscular',name:'М’язи',color:'#a85b50',description:'Скелетні м’язи створюють рух, тягнучи за місця прикріплення. Разом із сухожиллями вони рухають суглоби, утримують поставу й виробляють тепло.'},
 {id:'cardiac',name:'Серце',color:'#b96760',description:'Серце — м’язовий насос із чотирма камерами. Його клапани спрямовують кров уперед по малому та великому колах кровообігу.'},
 {id:'sensory',name:'Органи чуття',color:'#b0c8ce',description:'Ці структури забезпечують органи чуття, зокрема зір, слух і рівновагу. Їхні спеціалізовані тканини сприймають подразники й передають інформацію разом із нервовою системою.'},
 {id:'arterial',name:'Артерії',color:'#c05245',description:'Серце гонить кров по судинах. Артерії відводять кров від серця до тканин, а в малому колі кровообігу — до легень.'},
 {id:'venous',name:'Вени',color:'#527c9f',description:'Вени повертають кров до серця. Поверхневі та глибокі мережі збирають кров із тканин, а легеневі вени несуть збагачену киснем кров від легень.'},
 {id:'nervous',name:'Нервова система',color:'#d8b565',description:'Головний і спинний мозок та периферичні нерви передають і обробляють сигнали. Вони забезпечують чутливість, рух, координацію та автоматичну регуляцію функцій організму.'},
 {id:'respiratory',name:'Дихальна',color:'#b98991',description:'Дихальні шляхи проводять повітря до легень, де кисень і вуглекислий газ обмінюються між повітрям і кров’ю. Дихання залежить від змін тиску, створених дихальними м’язами.'},
 {id:'digestive',name:'Травна',color:'#b8916b',description:'Травний тракт розщеплює їжу, всмоктує поживні речовини та воду й просуває залишки далі. Допоміжні органи виділяють жовч і травні ферменти.'},
 {id:'urinary',name:'Сечова',color:'#b47961',description:'Нирки фільтрують кров і регулюють баланс рідини, електролітів та кислотно-лужний баланс. Сеча проходить сечоводами до сечового міхура й виводиться сечівником.'},
 {id:'lymphatic',name:'Лімфатична',color:'#879f7c',description:'Лімфатичні судини повертають надлишок тканинної рідини в кровообіг. Лімфатичні вузли та інші лімфоїдні органи забезпечують імунний нагляд і відповіді.'},
 {id:'endocrine',name:'Ендокринна',color:'#c5a09a',description:'Ендокринні органи виділяють гормони в кров для координації обміну речовин, росту, реакції на стрес і розмноження.'},
 {id:'reproductive',name:'Статева',color:'#bda098',description:'Показані чоловічі статеві структури беруть участь в утворенні, дозріванні й транспорті сперми та виробленні статевих гормонів.'},
 {id:'integumentary',name:'Поверхня тіла',color:'#ba9b7d',description:'Поверхня тіла слугує зовнішнім анатомічним орієнтиром. Покривна система формує захисний бар’єр, бере участь у чутливості та терморегуляції.'},
 {id:'connective',name:'Сполучна тканина',color:'#aec3bb',description:'Хрящі, зв’язки та інші сполучні тканини підтримують, з’єднують і розмежовують структури. Вони стабілізують суглоби та розподіляють механічні навантаження.'},
];
export interface Part {id:string;name:string;conceptId:string;system:SystemId;chunk:number;positions:number;normals:number;indices:number;vertexCount:number;indexCount:number;bounds:[number[],number[]]}
export interface Concept {id:string;name:string;elements:string[]}
export interface Atlas {version:string;sex?:'male';source?:string;scope?:string;parts:Part[];concepts:Concept[];chunks:{url:string;bytes:number;gzip?:string;gzipBytes?:number}[];triangles:number}
export type View = 'three-quarter'|'front'|'back'|'side';
export interface SceneState {inspectorOpen?:boolean;explode:number;visible:SystemId[];selected:string[];hidden:string[];severity:Record<string, number>;severityColors?:Record<string, string>;isolate:boolean;view:View;rotate:boolean;reset:number;fit:number}
export const DEFAULT_VISIBLE:SystemId[] = ['cardiac','sensory','skeletal','muscular','arterial','venous','nervous','respiratory','digestive','urinary','lymphatic','endocrine','reproductive','connective'];
export const EXPLANATIONS:Record<string,string> = {
 'heart':'М’язовий насос у грудній клітці. Права половина спрямовує кров до легень, ліва — у великий круг кровообігу.',
 'liver':'Великий орган під правою частиною діафрагми. Обробляє всмоктані поживні речовини, виробляє жовч і синтезує багато білків крові.',
 'brain':'Центральний орган нервової системи. Його взаємопов’язані ділянки забезпечують сприйняття, рух, пам’ять, мову та регуляцію функцій організму.',
 'stomach':'М’язова камера між стравоходом і тонкою кишкою. Накопичує їжу та змішує її з кислотою й ферментами перед передачею у дванадцятипалу кишку.',
 'spleen':'Лімфоїдний орган у верхній лівій частині живота. Фільтрує кров, видаляє старі клітини крові та бере участь в імунних реакціях.',
 'pancreas':'Орган черевної порожнини з травною та ендокринною функціями. Постачає ферменти в тонку кишку й виділяє гормони, зокрема інсулін і глюкагон.',
 'urinary bladder':'М’язовий резервуар у тазі, що накопичує сечу, яка надходить від нирок сечоводами.',
 'trachea':'Головний дихальний шлях між гортанню та бронхами. Хрящові півкільця утримують його відкритим під час дихання.',
 'diaphragm':'Широкий м’яз, що розділяє грудну й черевну порожнини. Скорочуючись, збільшує об’єм грудної клітки й допомагає вдихати повітря.',
};
export function explanation(name:string,system:SystemId){return EXPLANATIONS[name.toLowerCase()] ?? SYSTEMS.find(s=>s.id===system)?.description ?? '';}
