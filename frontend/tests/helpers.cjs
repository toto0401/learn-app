const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
let vue;
for (const base of [process.env.VUE_RUNTIME_DIR, root, '/Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli-vite']) {
  if (!base) continue;
  try { vue = createRequire(path.join(base, 'package.json'))('vue'); break; } catch {}
}
if (!vue) throw new Error('Install Vue 3 or set VUE_RUNTIME_DIR to its project directory.');

function environment(overrides = {}) {
  const storage = new Map();
  const handlers = new Map();
  const timers = new Map();
  let now = 1800000000000;
  let sequence = 0;
  let failWrite = null;
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const uni = {
    getStorageSync: key => storage.get(key) ?? '',
    setStorageSync(key, value) {
      if (failWrite && failWrite(key, value)) throw new Error('Storage full');
      storage.set(key, value);
    },
    removeStorageSync: key => storage.delete(key),
    $on(name, fn) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn); },
    $off(name, fn) { handlers.get(name)?.delete(fn); },
    $emit(name, ...args) { for (const fn of handlers.get(name) || []) fn(...args); },
    showModal() {}, reLaunch() {}, showToast() {}
  };
  const uploads = [];
  const remote = new Map();
  const api = {
    async getStudyData(token) { return remote.get(token) || { initialized: false, tasks: [], review_cards: [], checkin_days: [], review_seconds: 0 }; },
    async saveStudyData(data, token) {
      const result = { ...JSON.parse(JSON.stringify(data)), initialized: true };
      uploads.push({ token, data: result }); remote.set(token, result); return result;
    }, ...overrides
  };
  const context = vm.createContext({
    console, uni, Date: Clock,
    setTimeout: (fn, ms) => { const id=++sequence; timers.set(id, { fn, at: now+ms }); return id; },
    clearTimeout: id => timers.delete(id),
    setInterval: (fn, ms) => { const id=++sequence; timers.set(id, { fn, at:now+ms, interval:ms }); return id; },
    clearInterval: id => timers.delete(id)
  });
  const modules = new Map();
  const stubs = new Map([
    ['vue', vue],
    [path.join(root, 'api/study.js'), api],
    [path.join(root, 'api/translate.js'), { translateWord: overrides.translateWord || (async () => '翻译结果') }],
    [path.join(root, 'api/request.js'), { request: async () => ({}), resolveApiUrl: value => value || '' }],
    [path.join(root, 'api/auth.js'), Object.fromEntries(['deleteAvatar','loginBySms','registerWithSms','resetPasswordBySms','sendSms','updateNickname','uploadAvatar'].map(name => [name, async()=>({})]))]
  ]);
  function resolve(id, parent) {
    if (id === 'vue') return id;
    if (id.startsWith('@/')) return path.join(root, id.slice(2));
    return path.resolve(parent ? path.dirname(parent) : root, id);
  }
  function moduleFor(id) {
    if (modules.has(id)) return modules.get(id);
    let module;
    if (stubs.has(id)) {
      const values=stubs.get(id);
      module=new vm.SyntheticModule(Object.keys(values), function() { for(const [key,value] of Object.entries(values)) this.setExport(key,value); }, {context, identifier:id});
    } else {
      let source=fs.readFileSync(id, 'utf8');
      if (id.endsWith('.vue')) source=source.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
      module=new vm.SourceTextModule(source, {context, identifier:id});
    }
    modules.set(id,module); return module;
  }
  async function load(id) {
    const module=moduleFor(resolve(id));
    if (module.status==='unlinked') await module.link((specifier,parent)=>moduleFor(resolve(specifier,parent.identifier)));
    if (module.status==='linked') await module.evaluate();
    return module.namespace;
  }
  const write = (key,value)=>uni.setStorageSync(key,JSON.stringify(value));
  const read = key=>JSON.parse(uni.getStorageSync(key)||'null');
  return { load, uni, storage, uploads, remote, write, read, timers,
    failWrites(fn) { failWrite=fn; },
    advance(ms) { now+=ms; for(const [id,timer] of [...timers]) if(timer.at<=now) { if(timer.interval) timer.at=now+timer.interval; else timers.delete(id); timer.fn(); } },
    session(id) { const session={id,accessToken:`test-token-${id}`,nickname:`User ${id}`};write('auth_session',session);return session; }
  };
}
const task=(id='task-1')=>({id,subject:'物理',description:id,duration:30,done:false,elapsed:0,weekKey:'2026-W38',dayIndex:5});
const card=(id='card-1',back='固态、液态、气态')=>({id,front:'物质的三种状态',back,subject:'物理',createdAt:1800000000000,nextReview:1800000000000,interval:0,ease:2.5,reviewCount:0,memoryStatus:'未复习'});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
module.exports={environment,task,card,deferred};
