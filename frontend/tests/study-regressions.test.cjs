// Regressions for ISSUE-001 through ISSUE-006, found by /qa on 2026-09-19.
// Evidence: .gstack/qa-reports/2026-09-19/report.md
const test = require('node:test');
const assert = require('node:assert/strict');
const { environment, task, card, deferred } = require('./helpers.cjs');

test('ISSUE-001: fresh account initializes and uploads its first task', async () => {
  const env=environment(); const user=env.session(1);
  const sync=await env.load('composables/useStudySync.js');
  await sync.initializeStudyData(user);
  assert.equal(env.uni.getStorageSync('study_data_owner_id'),'1');
  env.write('planner_tasks',[task()]); sync.scheduleStudyDataSync(); await sync.flushStudyDataSync();
  assert.equal(env.remote.get(user.accessToken).tasks[0].id,'task-1');
});

test('ISSUE-001: account switch hides previous data before the network responds', async () => {
  const pending=deferred();
  const env=environment({getStudyData:()=>pending.promise});
  env.session(1); env.uni.setStorageSync('study_data_owner_id','1');
  env.uni.setStorageSync('study_data_dirty','1'); env.write('planner_tasks',[task('private-a')]);
  const planner=(await env.load('composables/usePlanner.js')).usePlanner();
  const sync=await env.load('composables/useStudySync.js');
  const userB=env.session(2); const initialization=sync.initializeStudyData(userB);
  assert.equal(planner.tasks.value.length,0);
  assert.deepEqual(env.read('planner_tasks'),[]);
  pending.resolve({initialized:false}); await initialization;
  assert.equal(env.remote.get(userB.accessToken).tasks.length,0);
  const userA=env.session(1); await sync.initializeStudyData(userA);
  assert.equal(env.read('planner_tasks')[0].id,'private-a');
});

test('ISSUE-002: manual answers remain complete after saving and reloading', async () => {
  const env=environment();const review=(await env.load('composables/useReview.js')).useReview();
  const answer='固态、液态、气态；温度 < 0 时结冰';
  review.addCard('物质的状态',answer,'物理');review.loadCards();
  assert.equal(review.cards.value[0].back,answer);
  await review.ensureCardTranslation(review.cards.value[0].id);
  assert.equal(env.read('review_cards')[0].back,answer);
});

test('ISSUE-005: numeric and English answers are displayed and never translated over', async () => {
  let calls=0;const env=environment({translateWord:async()=>{calls++;return '错误替换';}});
  const review=(await env.load('composables/useReview.js')).useReview();
  const page=(await env.load('pages/review/review.vue')).default;
  const view={...page.methods,translationMessage:'loading'};
  for(const answer of ['2','E = mc²','water']) {
    review.addCard('Answer',answer);const current=review.cards.value.at(-1);
    await review.ensureCardTranslation(current.id);
    assert.equal(current.back,answer);
    assert.equal(view.displayCardBack(current),answer);
  }
  assert.equal(calls,0);
});

test('ISSUE-003: forgotten card becomes due automatically and refresh stops when hidden', async () => {
  const env=environment();env.write('review_cards',[card()]);
  const review=(await env.load('composables/useReview.js')).useReview();
  review.startDueRefresh();review.reviewCard('card-1',0);
  assert.equal(review.dueCards.value.length,0);
  env.advance(10*60*1000+1000);
  assert.equal(review.dueCards.value.length,1);
  review.stopDueRefresh();assert.equal(env.timers.size,0);
});

test('ISSUE-004: invalid backup types or entries leave every storage key unchanged', async () => {
  const env=environment();env.write('planner_tasks',[task()]);env.write('review_cards',[card()]);
  const backup=(await env.load('composables/useBackup.js')).useBackup();
  const before=JSON.stringify([...env.storage]);
  for(const data of [
    {planner_tasks:{invalid:true}},
    {planner_tasks:[task('valid-replacement')],review_cards:'not-an-array'},
    {planner_tasks:[{...task(),duration:-1}]},
    {planner_tasks:[task(),task()]},
    {review_cards:[{...card(),back:{bad:true}}]},
    {profile_data:{checkinDays:['2026-02-31']}},
    {reminder_settings:{enabled:'true'}},
    {managed_sources:[null]},
    {translate_cache_v2:{word:{invalid:true}}}
  ]) {
    assert.throws(()=>backup.importBackup(JSON.stringify({version:1,data})));
    assert.equal(JSON.stringify([...env.storage]),before);
  }
});

test('ISSUE-004: partial storage failure rolls the import back', async () => {
  const env=environment();env.write('planner_tasks',[task()]);env.write('review_cards',[card()]);
  const backup=(await env.load('composables/useBackup.js')).useBackup();
  const before=JSON.stringify([...env.storage]);let failed=false;
  env.failWrites(key=>{if(key==='review_cards'&&!failed){failed=true;return true;}return false;});
  assert.throws(()=>backup.importBackup(JSON.stringify({version:1,data:{planner_tasks:[task('new')],review_cards:[]}})));
  assert.equal(JSON.stringify([...env.storage]),before);
});

test('ISSUE-006: valid import refreshes live task/card data and survives subsequent edits', async () => {
  const env=environment();env.write('planner_tasks',[task('old')]);env.write('review_cards',[card('old')]);
  const planner=(await env.load('composables/usePlanner.js')).usePlanner();
  const review=(await env.load('composables/useReview.js')).useReview();
  const backup=(await env.load('composables/useBackup.js')).useBackup();
  backup.importBackup(JSON.stringify({version:1,data:{planner_tasks:[task('restored')],review_cards:[card('restored')]}}));
  assert.equal(planner.tasks.value[0].id,'restored');
  assert.equal(review.cards.value[0].id,'restored');
  planner.addTask('物理','new task',30);
  assert.ok(env.read('planner_tasks').some(t=>t.id==='restored'));
});

test('ISSUE-006: importing a backup stops old timers without overwriting restored progress', async () => {
  const env=environment();env.write('planner_tasks',[task()]);
  const planner=(await env.load('composables/usePlanner.js')).usePlanner();
  const backup=(await env.load('composables/useBackup.js')).useBackup();
  planner.startTimer('task-1');env.advance(1000);
  backup.importBackup(JSON.stringify({version:1,data:{planner_tasks:[{...task(),elapsed:300}]}}));
  assert.equal(planner.timingTaskId.value,null);
  env.advance(60000);assert.equal(env.read('planner_tasks')[0].elapsed,300);
});

test('ISSUE-001: failed initialization leaves the new account isolated and retries later', async () => {
  let fail=true;
  const env=environment({getStudyData:async()=>{if(fail) throw new Error('offline');return {initialized:false};}});
  env.session(1);env.uni.setStorageSync('study_data_owner_id','1');env.write('planner_tasks',[task('private-a')]);
  const planner=(await env.load('composables/usePlanner.js')).usePlanner();
  const sync=await env.load('composables/useStudySync.js');const b=env.session(2);
  await assert.rejects(sync.initializeStudyData(b),/offline/);
  assert.equal(planner.tasks.value.length,0);
  planner.addTask('物理','offline b',30);fail=false;
  await sync.initializeStudyData(b);
  assert.equal(env.remote.get(b.accessToken).tasks[0].description,'offline b');
});

test('ISSUE-001: old account GET responses cannot restore private data after a switch', async () => {
  const a=deferred();const env=environment({getStudyData:token=>token==='test-token-1'?a.promise:Promise.resolve({initialized:false})});
  const sync=await env.load('composables/useStudySync.js');const userA=env.session(1);
  const original=sync.initializeStudyData(userA);
  const userB=env.session(2);await sync.initializeStudyData(userB);
  a.resolve({initialized:true,tasks:[task('private-a')],review_cards:[],checkin_days:[]});await original;
  assert.deepEqual(env.read('planner_tasks'),[]);
  assert.equal(env.uni.getStorageSync('study_data_owner_id'),'2');
});

test('ISSUE-001: edits made during initialization upload are never replaced by its response', async () => {
  const upload=deferred();const started=deferred();
  const env=environment({saveStudyData:()=>{started.resolve();return upload.promise;}});
  const user=env.session(1);const sync=await env.load('composables/useStudySync.js');
  const init=sync.initializeStudyData(user);await started.promise;
  env.write('planner_tasks',[task('newer-edit')]);sync.scheduleStudyDataSync();
  upload.resolve({initialized:true,tasks:[],review_cards:[],checkin_days:[],review_seconds:0});await init;
  assert.equal(env.read('planner_tasks')[0].id,'newer-edit');
  assert.equal(env.uni.getStorageSync('study_data_dirty'),'1');
});

test('ISSUE-001: old upload completion preserves dirty edits and PUTs are serialized', async () => {
  const first=deferred();let calls=0;const bodies=[];
  const env=environment({saveStudyData:async data=>{calls++;bodies.push(JSON.parse(JSON.stringify(data)));if(calls===1)return first.promise;return data;}});
  env.session(1);env.uni.setStorageSync('study_data_owner_id','1');
  const sync=await env.load('composables/useStudySync.js');env.write('planner_tasks',[task('first')]);
  sync.scheduleStudyDataSync();const initial=sync.flushStudyDataSync();
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  env.write('planner_tasks',[task('latest')]);sync.scheduleStudyDataSync();const latest=sync.flushStudyDataSync();
  assert.equal(calls,1);first.resolve(bodies[0]);await initial;await latest;
  assert.equal(calls,2);assert.equal(bodies[1].tasks[0].id,'latest');
  assert.equal(env.uni.getStorageSync('study_data_dirty'),'0');
});

test('ISSUE-001: ownerless legacy data is preserved without leaking to a new account', async () => {
  const env=environment();env.write('planner_tasks',[task('legacy-a')]);
  env.uni.setStorageSync('profile_data_owner_id','1');env.write('profile_data',{nickname:'A',checkinDays:[]});
  const sync=await env.load('composables/useStudySync.js');await sync.initializeStudyData(env.session(2));
  assert.deepEqual(env.read('planner_tasks'),[]);
  await sync.initializeStudyData(env.session(1));
  assert.equal(env.read('planner_tasks')[0].id,'legacy-a');
});

test('ISSUE-001: data without any owner is retained separately, never uploaded as a new user', async () => {
  const env=environment();env.write('planner_tasks',[task('unknown-owner')]);
  const sync=await env.load('composables/useStudySync.js');const user=env.session(1);await sync.initializeStudyData(user);
  assert.deepEqual(env.read('planner_tasks'),[]);
  const saved=[...env.storage.keys()].find(key=>key.startsWith('study_data_unassigned_'));
  assert.equal(env.read(saved).tasks[0].id,'unknown-owner');
  assert.equal(env.remote.get(user.accessToken).tasks.length,0);
});

test('ISSUE-004: exported backup round-trips with defaults for older card fields', async () => {
  const env=environment();const oldCard=card();delete oldCard.memoryStatus;delete oldCard.reviewCount;
  env.write('planner_tasks',[task()]);env.write('review_cards',[oldCard]);
  const backup=(await env.load('composables/useBackup.js')).useBackup();const exported=backup.exportBackup();
  env.write('planner_tasks',[]);backup.importBackup(exported);
  assert.equal(env.read('planner_tasks')[0].id,'task-1');
  assert.equal(env.read('review_cards')[0].memoryStatus,'未复习');
  assert.equal(env.read('review_cards')[0].back,'固态、液态、气态');
});

test('ISSUE-006: restored review time and profile refresh together with tasks', async () => {
  const env=environment();env.session(1);env.uni.setStorageSync('study_data_owner_id','1');
  const studyTime=(await env.load('composables/useStudyTime.js')).useStudyTime();
  const profile=(await env.load('composables/useProfile.js')).useProfile();
  const backup=(await env.load('composables/useBackup.js')).useBackup();
  studyTime.startReviewCardTiming('old-card');env.advance(10000);
  backup.importBackup(JSON.stringify({version:1,data:{study_statistics:{reviewSeconds:120},profile_data:{nickname:'恢复昵称',checkinDays:['2026-09-19']}}}));
  env.advance(10000);studyTime.stopReviewCardTiming();
  assert.equal(studyTime.reviewSeconds.value,120);
  assert.equal(profile.nickname.value,'恢复昵称');assert.equal(profile.checkinDays.value[0],'2026-09-19');
});

test('ISSUE-002: old translation completion cannot overwrite a replacement card', async () => {
  const translation=deferred();const env=environment({translateWord:()=>translation.promise});env.session(1);
  env.write('review_cards',[{...card(),front:'Photosynthesis',back:''}]);
  const review=(await env.load('composables/useReview.js')).useReview();const pending=review.ensureCardTranslation('card-1');
  env.write('review_cards',[card('card-1','原样保留的答案')]);env.uni.$emit('study-data-updated');
  translation.resolve('旧翻译');await pending;
  assert.equal(review.cards.value[0].back,'原样保留的答案');
});
