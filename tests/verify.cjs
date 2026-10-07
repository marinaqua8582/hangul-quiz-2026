const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const root = __dirname + '/../';
const ts = require(root + 'node_modules/typescript');
function moduleFrom(path, dependencies, extra = {}) {
  const source = fs.readFileSync(root + path, 'utf8').replaceAll('import.meta.env.VITE_APPS_SCRIPT_URL', "'https://script.google.com/macros/s/test/exec'");
  const exports = {};
  const context = {exports, require: name => dependencies[name], console: {log(){},warn(){},error(){}}, ...extra};
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, context);
  return exports;
}
const ranks = moduleFrom('src/data/ranks.ts', {});
const storage = {getItem(){return null;},setItem(){},removeItem(){}};
let response, calls=[];
const api = moduleFrom('src/services/api.ts', {'../data/ranks.ts':ranks}, {
  localStorage:storage,sessionStorage:storage,
  fetch:async(url, options)=>{calls.push({url,payload:JSON.parse(options.body)});return {ok:true,status:200,text:async()=>JSON.stringify(response)};}
});
const creds={grade:'2',class:'5',number:'25',name:'김과학'};
async function frontendTests(){
  response={success:true,status:'submitted',studentKey:'2-5-25',student:creds,result:{score:45,rankTitle:'한글 학동'}};
  const login=await api.loginStudent(creds);
  assert.equal(login.status,'submitted');assert.equal(login.finalResult.name,'김과학');assert.equal(login.finalResult.score,45);
  response={success:true,result:{score:45,rankTitle:'한글 학동'}};
  const submission=await api.submitQuiz({...creds,studentKey:'2-5-25',answers:{},quizStartedAt:''});
  assert.equal(submission.result.classNum,5);assert.equal(submission.result.name,'김과학');
  response={success:true,participantCount:2,students:[{...creds,score:45,rankTitle:'한글 학동'},{...creds,number:'26',name:'이삼진',score:100,rankTitle:'한글 대왕'}]};
  const dashboard=await api.getDashboard({token:'test',grade:2,class:5});
  assert.equal(dashboard.totalCount,2);assert.equal(dashboard.students[0].studentKey,'2-5-25');assert.equal(dashboard.students[1].classNum,5);
  assert(calls.every(c=>c.url.endsWith('/exec')));
  assert(!calls.some(c=>['saveProgress','loadProgress'].includes(c.payload.action)));
  response={success:true,status:'submitted'};assert.equal((await api.loginStudent(creds)).success,false);
  console.log('PASS: production response compatibility, result identity, dashboard keys/count, /exec actions, missing-result rejection');
}
frontendTests().then(()=>{
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('crypto');
const headers={Roster:['studentKey','grade','class','number','name','active'],Progress:['studentKey','grade','class','number','name','answersJson','currentQuestion','quizStartedAt','updatedAt','submitted'],Submissions:['studentKey','grade','class','number','name','answersJson','correctCount','score','rankTitle','elapsedSeconds','quizStartedAt','submittedAt']};
const rows={Roster:[headers.Roster,['2-5-25',2,5,25,'김과학',true],['2-5-26',2,5,26,'이삼진',true]],Progress:[headers.Progress],Submissions:[headers.Submissions],AuthorizedTestCleanupBackup:[['sourceSheet','sourceRow','studentKey','backupAt','rowJson']]};
let formats=[],writes=[],deletes=[];const sheets={};
for(const name of Object.keys(rows))sheets[name]={getLastRow:()=>rows[name].length,getDataRange:()=>({getValues:()=>rows[name]}),getRange:(r,c=1,n=1,m=1)=>{
  if(typeof r==='string')return {setNumberFormat:()=>{throw Error('must not format existing whole column');}};
  const range={getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>rows[name][r+i-1]?.[c+j-1]??'')),getValue:()=>rows[name][r-1]?.[c-1],getNumberFormat:()=>formats.findLast(item=>item.name===name&&item.r===r&&item.c===c)?.f||'General',setNumberFormat:f=>{formats.push({name,r,c,f});return range;},setValue:v=>{assert.equal(typeof v,'string');writes.push({name,r,c});rows[name][r-1][c-1]=v;return range;},setValues:values=>{writes.push({name,r,c});for(let i=0;i<values.length;i++){rows[name][r+i-1]??=[];for(let j=0;j<values[i].length;j++)rows[name][r+i-1][c+j-1]=values[i][j];}return range;}};return range;
},deleteRow:r=>{deletes.push({name,r});rows[name].splice(r-1,1);}};
const props=new Map(),cache=new Map();let locked=false;
const context={console:{log(){},error(){}},Date,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheets[n],getSpreadsheetTimeZone:()=> 'Asia/Seoul'}),flush(){}},LockService:{getScriptLock:()=>({waitLock(){assert(!locked);locked=true;},releaseLock(){locked=false;}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,text)=>[...crypto.createHash('sha256').update(text).digest()],getUuid:()=>crypto.randomUUID(),formatDate:date=>date.getUTCFullYear()+'-'+(date.getUTCMonth()+1)+'-'+date.getUTCDate()}};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../google-apps-script/Code.gs','utf8'),context);
const creds={studentKey:'2-5-25',grade:2,class:5,number:25,name:'김과학'};
assert.equal(context.normalizeStudentKey_(new Date('2002-05-25T00:00:00Z')),'2-5-25');assert.equal(context.normalizeStudentKey_('2002-5-26'),'2-5-26');assert.equal(context.normalizeStudentKey_("'2-5-25"),'2-5-25');
assert.equal(context.loginStudent_(creds).status,'new');
const answers=vm.runInContext('Object.fromEntries(QUIZ_ANSWERS.map(q=>[q.id,q.accepted[0]]))',context);
const submit=context.submitQuiz_({...creds,answers});assert.equal(submit.result.score,100);assert.equal(rows.Submissions.length,2);assert.equal(rows.Submissions[1][0],'2-5-25');assert.equal(rows.Progress.length,1);assert.equal(formats.at(-1).f,'@');
rows.Submissions[1][0]=new Date('2002-05-25T00:00:00Z');
assert.equal(context.loginStudent_(creds).status,'submitted');assert.equal(context.submitQuiz_({...creds,answers}).alreadySubmitted,true);assert.equal(rows.Submissions.length,2);
assert.throws(()=>context.submitQuiz_({...creds,name:'이삼진',answers}));
rows.Submissions.push(rows.Submissions[1].slice());rows.Progress.push([new Date('2002-05-25T00:00:00Z'),2,5,25,'김과학','{}',1,'','','false']);rows.Progress.push(rows.Progress[1].slice());
// Protected sentinel has no real student identity and proves unrelated rows are not rewritten.
rows.Submissions.push(['protected',3,9,99]);const sentinel=rows.Submissions.at(-1);
const repair=context.repairAuthorizedTestStudents();assert.equal(repair.Submissions.removedTestDuplicates,1);assert.equal(repair.Progress.removedTestDuplicates,1);assert.equal(rows.Submissions[1][0],'2-5-25');assert.equal(rows.Submissions.at(-1),sentinel);assert.equal(sentinel[0],'protected');
assert.equal(context.loginStudent_(creds).result.score,100);assert.equal(context.submitQuiz_({...creds,answers}).alreadySubmitted,true);
assert.equal(rows.AuthorizedTestCleanupBackup.length,3);
rows.Submissions.push(['2-5-26',2,5,26,'이삼진','{}',20,100,'한글 대왕',0,'','']);
const firstStudentRow=rows.Submissions[1];
context.resetAuthorizedSecondTestStudent();assert.equal(rows.Submissions[1],firstStudentRow);assert(!rows.Submissions.some(row=>row[4]==='이삼진'));assert.equal(rows.AuthorizedTestCleanupBackup.length,4);
const audit=context.verifyAuthorizedTestSubmissions();assert.equal(audit.Submissions['2-5-25'].count,1);assert.equal(audit.Submissions['2-5-25'].textFormat,true);assert.equal(audit.Submissions['2-5-25'].stringKeys,true);
assert.equal(context.doPost({postData:{contents:JSON.stringify({action:'loadProgress',studentKey:'2-5-25'})}}).success,false);
assert.equal(context.doGet({}).version,'2026-10-08-studentkey-text-v1');
assert(!JSON.stringify(context.getRosterOptions_()).includes('김과학'));
console.log('PASS: date/string legacy keys, canonical row identifiers, text-before-write, duplicate prevention, authenticated existing results, test-only repair, protected-row preservation, local-only progress, API version');

}).catch(error=>{console.error(error);process.exitCode=1;});
