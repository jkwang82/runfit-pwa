(() => {
  "use strict";
  const KEY = "runfit_pwa_data_v1";
  const $ = (id) => document.getElementById(id);
  const today = () => new Date().toLocaleDateString("sv-SE");
  const dateObj = (s) => new Date(`${s}T12:00:00`);
  const state = loadState();
  let toastTimer;

  function blankState(){ return {foods:[],runs:[],weights:[],checks:{}}; }
  function loadState(){
    try { const raw=localStorage.getItem(KEY); if(!raw) return blankState(); const v=JSON.parse(raw); return {...blankState(),...v}; }
    catch(e){ return blankState(); }
  }
  function save(){ try { localStorage.setItem(KEY,JSON.stringify(state)); } catch(e){ alert("저장 공간에 문제가 있어요. 백업 파일을 내보내고 브라우저 저장 공간을 확인해 주세요."); } renderAll(); }
  function escapeHtml(v){ return String(v ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
  function fmt(n, digits=1){ return Number(n||0).toLocaleString("ko-KR",{maximumFractionDigits:digits,minimumFractionDigits:0}); }
  function showToast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),2100); }
  function sum(arr,key){ return arr.reduce((a,x)=>a+num(x[key]),0); }
  function dateRangeWeek(dateStr){
    const d=dateObj(dateStr); const day=(d.getDay()+6)%7; const start=new Date(d); start.setDate(d.getDate()-day);
    const end=new Date(start); end.setDate(start.getDate()+6);
    return [start.toLocaleDateString("sv-SE"),end.toLocaleDateString("sv-SE")];
  }
  function monthStart(dateStr){ return dateStr.slice(0,7); }
  function dayLabel(dateStr){ return dateObj(dateStr).toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"}); }
  function getChecks(dateStr){ return state.checks[dateStr] || {food:false,exercise:false,protein:false,weight:false}; }
  function setCheck(dateStr,key,val){ if(!state.checks[dateStr]) state.checks[dateStr]={food:false,exercise:false,protein:false,weight:false}; state.checks[dateStr][key]=val; save(); }
  const checkItems=[["food","식단 기록 완료"],["exercise","러닝 또는 휴식 완료"],["protein","단백질 목표 확인"],["weight","체중 기록 완료"]];

  function renderHome(){
    const t=today(), w=latestWeight();
    $("todayLabel").textContent=dayLabel(t);
    $("homeWeight").innerHTML=`${fmt(w?.value ?? 88)} <small>kg</small>`;
    const left=Math.max(0,Math.round((dateObj("2027-02-28")-dateObj(t))/86400000));
    $("daysLeft").textContent=left===0?"목표일":`D-${left}`;
    const start=w?.value ?? 88, total=88-75, progress=Math.max(0,Math.min(100,((88-start)/total)*100));
    $("weightProgress").style.width=`${progress}%`;
    $("weightProgressText").textContent=start<=75?"목표 체중 달성":`목표까지 ${fmt(Math.max(0,start-75))}kg`;
    const foods=state.foods.filter(x=>x.date===t), runs=state.runs.filter(x=>x.date===t);
    const cals=sum(foods,"calories"), protein=sum(foods,"protein"), km=sum(runs,"distance"), mins=sum(runs,"minutes");
    $("homeCalories").innerHTML=`${fmt(cals,0)} <small>/ 2,300 kcal</small>`;
    $("homeProtein").innerHTML=`${fmt(protein)} <small>/ 140 g</small>`;
    $("homeRun").innerHTML=`${fmt(km)} <small>km</small>`;
    $("homeRunTime").textContent=mins?`${fmt(mins)}분 운동`:"운동 기록 없음";
    $("calorieBar").style.width=`${Math.min(100,cals/2300*100)}%`;
    $("proteinBar").style.width=`${Math.min(100,protein/140*100)}%`;
    const checks=getChecks(t), completed=checkItems.filter(([k])=>checks[k]).length;
    $("homeChecks").innerHTML=`${completed} <small>/ 4 완료</small>`;
    $("homeChecklist").innerHTML=checkItems.map(([key,label])=>`<label class="check-row"><input type="checkbox" data-check="${key}" ${checks[key]?"checked":""}><span>${label}</span></label>`).join("");
    $("homeChecklist").querySelectorAll("[data-check]").forEach(el=>el.addEventListener("change",()=>setCheck(t,el.dataset.check,el.checked)));
    const m=monthStart(t), monthRuns=state.runs.filter(x=>x.date.startsWith(m));
    $("monthLabel").textContent=dateObj(t).toLocaleDateString("ko-KR",{year:"numeric",month:"long"});
    $("monthKm").textContent=`${fmt(sum(monthRuns,"distance"))} km`;
    const monthWeights=state.weights.filter(x=>x.date.startsWith(m)).sort((a,b)=>a.date.localeCompare(b.date));
    $("monthWeightChange").textContent=monthWeights.length>1?`${fmt(monthWeights[monthWeights.length-1].value-monthWeights[0].value)} kg`:"기록 필요";
    const [ws,we]=dateRangeWeek(t);
    $("weekKm").textContent=`${fmt(sum(state.runs.filter(x=>x.date>=ws&&x.date<=we),"distance"))} km`;
  }
  function latestWeight(){ return [...state.weights].sort((a,b)=>b.date.localeCompare(a.date))[0] || null; }
  function renderFood(){
    const d=$("foodDate").value||today(), list=state.foods.filter(x=>x.date===d).sort((a,b)=>b.created-a.created);
    $("foodDayLabel").textContent=dayLabel(d);
    $("foodTotalCalories").textContent=`${fmt(sum(list,"calories"),0)} kcal`;
    $("foodTotalProtein").textContent=`${fmt(sum(list,"protein"))} g`;
    $("foodList").innerHTML=list.length?list.map(x=>`<article class="record"><div class="record-main"><p class="record-title">${escapeHtml(x.meal)} · ${escapeHtml(x.name)}</p><p class="record-meta">${fmt(x.calories,0)} kcal · 단백질 ${fmt(x.protein)}g</p></div><button class="delete-btn" data-delete-food="${x.id}">삭제</button></article>`).join(""):`<div class="empty">아직 식단 기록이 없어요.<br>위에서 첫 기록을 추가해 보세요.</div>`;
    $("foodList").querySelectorAll("[data-delete-food]").forEach(b=>b.addEventListener("click",()=>removeItem("foods",b.dataset.deleteFood)));
  }
  function pace(distance,minutes){
    if(distance<=0||minutes<=0)return "페이스 미입력";
    const total=Math.round(minutes/distance*60), mm=Math.floor(total/60), ss=total%60;
    return `${mm}:${String(ss).padStart(2,"0")} /km`;
  }
  function renderRuns(){
    const t=$("runDate").value||today(), m=monthStart(t), [ws,we]=dateRangeWeek(t);
    $("runMonthTotal").textContent=`${fmt(sum(state.runs.filter(x=>x.date.startsWith(m)),"distance"))} km`;
    $("runWeekTotal").textContent=`${fmt(sum(state.runs.filter(x=>x.date>=ws&&x.date<=we),"distance"))} km`;
    const list=[...state.runs].sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created);
    $("runRecordCount").textContent=`총 ${list.length}회`;
    $("runList").innerHTML=list.length?list.map(x=>`<article class="record"><div class="record-main"><p class="record-title">${escapeHtml(x.type)} · ${escapeHtml(x.date)}</p><p class="record-meta">${x.minutes?`${fmt(x.minutes)}분 · ${pace(x.distance,x.minutes)}`:"시간 미입력"}${x.note?` · ${escapeHtml(x.note)}`:""}</p></div><div class="record-value">${fmt(x.distance)} km <button class="delete-btn" data-delete-run="${x.id}">삭제</button></div></article>`).join(""):`<div class="empty">러닝 기록이 아직 없어요.</div>`;
    $("runList").querySelectorAll("[data-delete-run]").forEach(b=>b.addEventListener("click",()=>removeItem("runs",b.dataset.deleteRun)));
  }
  function renderWeights(){
    const latest=latestWeight(), v=latest?.value ?? 88, progress=Math.max(0,Math.min(100,(88-v)/13*100));
    $("weightPageProgress").style.width=`${progress}%`;
    $("weightPageText").textContent=v<=75?"목표 체중 달성!":`현재 ${fmt(v)}kg · 목표까지 ${fmt(v-75)}kg`;
    const list=[...state.weights].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);
    $("weightList").innerHTML=list.length?list.map(x=>`<article class="record"><div class="record-main"><p class="record-title">${escapeHtml(x.date)}</p><p class="record-meta">목표 75kg</p></div><div class="record-value">${fmt(x.value)} kg <button class="delete-btn" data-delete-weight="${x.id}">삭제</button></div></article>`).join(""):`<div class="empty">체중 기록이 아직 없어요.</div>`;
    $("weightList").querySelectorAll("[data-delete-weight]").forEach(b=>b.addEventListener("click",()=>removeItem("weights",b.dataset.deleteWeight)));
  }
  function renderWeeklyChecks(){
    const d=$("checkDate").value||today(), [start,end]=dateRangeWeek(d);
    const dates=[]; let cursor=dateObj(start);
    while(cursor<=dateObj(end)){dates.push(cursor.toLocaleDateString("sv-SE"));cursor.setDate(cursor.getDate()+1);}
    $("weeklyChecks").innerHTML=dates.map(date=>`<div class="weekly-day"><strong>${dayLabel(date)}</strong>${checkItems.map(([key,label])=>`<label class="check-row"><input type="checkbox" data-week-date="${date}" data-week-key="${key}" ${getChecks(date)[key]?"checked":""}><span>${label}</span></label>`).join("")}</div>`).join("");
    $("weeklyChecks").querySelectorAll("[data-week-date]").forEach(el=>el.addEventListener("change",()=>setCheck(el.dataset.weekDate,el.dataset.weekKey,el.checked)));
  }
  function renderAll(){ renderHome(); renderFood(); renderRuns(); renderWeights(); renderWeeklyChecks(); }
  function removeItem(collection,id){ if(!confirm("이 기록을 삭제할까요?"))return; state[collection]=state[collection].filter(x=>String(x.id)!==String(id)); save(); showToast("기록을 삭제했어요."); }
  function exportData(){
    const blob=new Blob([JSON.stringify({app:"RUN & FIT",version:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob), a=document.createElement("a"); a.href=url; a.download=`runfit-backup-${today()}.json`; a.click(); URL.revokeObjectURL(url); showToast("백업 파일을 만들었어요.");
  }
  function setup(){
    ["foodDate","runDate","weightDate","checkDate"].forEach(id=>$(id).value=today());
    document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>{
      document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b===btn));
      document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${btn.dataset.view}`));
      window.scrollTo({top:0,behavior:"smooth"});
    }));
    $("foodDate").addEventListener("change",renderFood);
    $("runDate").addEventListener("change",renderRuns);
    $("checkDate").addEventListener("change",renderWeeklyChecks);
    $("foodForm").addEventListener("submit",e=>{
      e.preventDefault();
      state.foods.push({id:crypto.randomUUID(),date:$("foodDate").value||today(),meal:$("mealType").value,name:$("foodName").value.trim(),calories:num($("foodCalories").value),protein:num($("foodProtein").value),created:Date.now()});
      save(); $("foodName").value=""; $("foodCalories").value=""; $("foodProtein").value=""; showToast("식단을 저장했어요.");
    });
    $("runForm").addEventListener("submit",e=>{
      e.preventDefault(); const distance=num($("runDistance").value), minutes=num($("runMinutes").value);
      if(distance<=0){showToast("거리는 0보다 커야 해요.");return;}
      state.runs.push({id:crypto.randomUUID(),date:$("runDate").value||today(),type:$("runType").value,distance,minutes,note:$("runNote").value.trim(),created:Date.now()});
      const date=$("runDate").value||today(); if(!state.checks[date])state.checks[date]={food:false,exercise:false,protein:false,weight:false}; state.checks[date].exercise=true;
      save(); $("runDistance").value=""; $("runMinutes").value=""; $("runNote").value=""; showToast("러닝을 저장했어요.");
    });
    $("weightForm").addEventListener("submit",e=>{
      e.preventDefault(); const value=num($("weightValue").value), date=$("weightDate").value||today();
      state.weights=state.weights.filter(x=>x.date!==date);
      state.weights.push({id:crypto.randomUUID(),date,value});
      if(!state.checks[date])state.checks[date]={food:false,exercise:false,protein:false,weight:false}; state.checks[date].weight=true;
      save(); showToast("체중을 저장했어요.");
    });
    $("backupBtn").addEventListener("click",exportData); $("exportBtn").addEventListener("click",exportData);
    $("restoreFile").addEventListener("change",async e=>{
      const file=e.target.files?.[0]; if(!file)return;
      try{
        const parsed=JSON.parse(await file.text()), d=parsed.data||parsed;
        if(!d||!Array.isArray(d.foods)||!Array.isArray(d.runs)||!Array.isArray(d.weights)||typeof d.checks!=="object")throw new Error("형식");
        if(!confirm("가져온 백업으로 현재 기록을 교체할까요? 먼저 현재 기록을 백업하는 것을 권장해요."))return;
        state.foods=d.foods;state.runs=d.runs;state.weights=d.weights;state.checks=d.checks;save();showToast("백업을 복원했어요.");
      }catch(err){alert("올바른 RUN & FIT 백업 JSON 파일이 아닙니다.");}
      e.target.value="";
    });
    $("clearBtn").addEventListener("click",()=>{if(confirm("모든 식단·운동·체중·체크 기록을 삭제할까요? 이 작업은 되돌릴 수 없어요.")){state.foods=[];state.runs=[];state.weights=[];state.checks={};save();showToast("모든 기록을 삭제했어요.");}});
    renderAll();
  }
  if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(()=>{});
  setup();
})();