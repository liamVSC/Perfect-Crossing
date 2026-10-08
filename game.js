(()=>{"use strict";
const C=window.PopPartyCore,$=id=>document.getElementById(id),STORE="pop-party-save-v1";
function characterMarkup(tile){if(typeof tile!=="number")return tile==="rocket"?"<span class='power-art rocket-art'>➜</span>":tile==="bomb"?"<span class='power-art bomb-art'>✹</span>":"<span class='power-art rainbow-art'>✦</span>";return "<span class='tile-dot' aria-hidden='true'></span>";}
function fxBurst(x,y,type="pop"){const root=$("fx-layer");if(!root)return;const burst=document.createElement("div");burst.className="fx-burst "+type;burst.style.left=x+"px";burst.style.top=y+"px";for(let n=0;n<8;n++){const p=document.createElement("i");p.style.setProperty("--a",n/8*360+"deg");p.style.setProperty("--d",24+Math.random()*42+"px");burst.appendChild(p);}root.appendChild(burst);setTimeout(()=>burst.remove(),700);}
function boardBurst(indices,type="pop"){const boardEl=$("board");indices.slice(0,12).forEach((i,n)=>{const el=boardEl.querySelector('[data-index="'+i+'"]');if(!el)return;const r=el.getBoundingClientRect();setTimeout(()=>fxBurst(r.left+r.width/2,r.top+r.height/2,type),n*18);});}
function comboBurst(level){const el=document.createElement("div");el.className="combo-burst";el.innerHTML="<strong>"+level+"x</strong><span>COMBO!</span>";$("fx-layer").appendChild(el);setTimeout(()=>el.remove(),900);}

let progress=loadProgress(),level=1,board=[],moves=25,score=0,collected={},busy=false,combo=0,seed=Date.now()>>>0,config,toastTimer,modalAction=null;
function loadProgress(){try{return C.sanitiseProgress(JSON.parse(localStorage.getItem(STORE)));}catch{return C.newProgress();}}
function save(){try{localStorage.setItem(STORE,JSON.stringify(progress));}catch{}}
function randomSeed(){seed=(seed+0x9e3779b9)>>>0;return seed;}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),1700);}
function startLevel(n){n=Math.max(1,Math.min(C.MAX_LEVEL,Number(n)||1));if(n!==progress.unlocked){toast(n<progress.unlocked?"That level is already completed.":"Finish the previous level first!");return;}level=n;progress.lastLevel=level;save();showGameScreen();config=C.levelConfig(level);moves=config.moves;score=0;combo=0;collected={};busy=false;board=C.createBoard(level,randomSeed());$("level-number").textContent=level;$("goal-title").textContent="Clear "+config.targets.reduce((s,t)=>s+t.count,0)+" tiles";$("goal-subtitle").textContent=level<5?"Big groups make bigger pops!":"Watch your moves — plan those combos!";render();updateHud();closeModal();}
function render(){const el=$("board");el.innerHTML="";board.forEach((tile,i)=>{const b=document.createElement("button");b.type="button";b.className="tile "+(tile===null?"empty":typeof tile==="string"?"power-"+tile:"c"+tile);b.setAttribute("role","gridcell");b.setAttribute("aria-label",tile===null?"Empty":typeof tile==="string"?tile+" power-up":"Colour tile");b.dataset.index=i;if(tile===null)b.disabled=true;else{const f=document.createElement("span");f.className="face expression-normal";f.innerHTML=characterMarkup(tile);b.appendChild(f);b.addEventListener("click",()=>tapTile(i));}el.appendChild(b);});}
function updateHud(){
  $("moves-left").textContent=moves;
  $("coin-count").textContent=progress.coins;
  $("home-coins").textContent=progress.coins||0;
  $("score-count").textContent=score;
  $("progress-fill").style.width=Math.min(100,score/Math.max(1,config.targetScore)*100)+"%";
  $("goals").innerHTML="";
  config.targets.forEach(t=>{
    const got=Math.min(t.count,collected[t.colour]||0),chip=document.createElement("div");
    chip.className="goal-chip"+(got>=t.count?" done":"");
    const face=document.createElement("span");face.className="goal-mini";face.innerHTML=characterMarkup(t.colour);
    const count=document.createElement("span");count.textContent=got+"/"+t.count;chip.append(face,count);$("goals").appendChild(chip);
  });
  ["rocket","bomb"].forEach(k=>$(k+"-count").textContent=progress.boosters[k]||0);
}
function showGameScreen(){
  $("home-screen")?.classList.add("hidden");
  $("game-screen")?.classList.remove("hidden");
}
$("play-level-button").addEventListener("click",()=>startLevel(progress.unlocked));
$("brand")?.addEventListener("click",e=>{e.preventDefault();closeModal();showHomeScreen();});

function init(){if(!$("fx-layer")){const fx=document.createElement("div");fx.id="fx-layer";fx.setAttribute("aria-hidden","true");document.body.appendChild(fx);}progress.unlocked=Math.max(1,progress.unlocked);save();showHomeScreen();if("serviceWorker"in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});}
init();
})();