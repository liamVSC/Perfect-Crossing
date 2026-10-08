const SAVE_KEY="perfect-crossing-save-v1";
const MAX_LEVEL=5000;
const PLAYER_X=50;

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function hashSeed(n){
  let x=(n|0)^0x9e3779b9;
  x=Math.imul(x^(x>>>16),0x85ebca6b);
  x=Math.imul(x^(x>>>13),0xc2b2ae35);
  return (x^(x>>>16))>>>0;
}
function rng(seed){
  let s=seed>>>0;
  return()=>{s=(s+0x6d2b79f5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
}
function difficulty(level){
  const t=Math.min(1,(level-1)/4999);
  return {
    lanes:clamp(2+Math.floor(t*7),2,9),
    speed:70+t*170,
    density:.2+t*.52,
    gap:Math.max(.16,.62-t*.38),
    vehicleScale:1+t*.45,
    pattern:Math.min(5,Math.floor(level/1000))
  };
}
function buildTraffic(level){
  const d=difficulty(level),random=rng(hashSeed(level)),cars=[];
  for(let lane=0;lane<d.lanes;lane++){
    const direction=(lane%2===0?1:-1)*(random()>.25?-1:1);
    const count=1+Math.floor(d.density*3+(random()>.58?1:0));
    const spacing=100/count;
    for(let i=0;i<count;i++){
      const width=(7+random()*8)*d.vehicleScale;
      let x=(i*spacing+random()*spacing*.65)%100;
      const speed=d.speed*(.72+random()*.65)*direction;
      const kind=random()>.82&&level>=1000?"truck":"car";
      const height=kind==="truck"?48:36;
      cars.push({lane,x,width,speed,kind,height});
    }
  }
  return cars;
}
function simulateSolvability(level,cars){
  const d=difficulty(level);
  // A crossing is always possible when every lane has at least one
  // safe time window at the player's crossing column. Simulate traffic
  // over the finite crossing time rather than relying on static gaps.
  const steps=180,dt=.05;
  const playerMoveTime=Math.max(.34,.68-level/9000);
  for(let lane=0;lane<d.lanes;lane++){
    const laneCars=cars.filter(c=>c.lane===lane);
    let safe=false;
    for(let step=0;step<steps;step++){
      const time=step*dt;
      const occupied=laneCars.some(c=>{
        let x=(c.x+(c.speed/100)*time*100)%100;
        if(x<0)x+=100;
        const left=x-c.width*.5;
        const right=x+c.width*.5;
        return PLAYER_X>=left && PLAYER_X<=right;
      });
      if(!occupied){safe=true;break;}
    }
    if(!safe)return false;
  }
  return true;
}
function makeLevel(level){
  for(let attempt=0;attempt<80;attempt++){
    const d=difficulty(level),cars=buildTraffic(level);
    if(simulateSolvability(level,cars))return{level,lanes:d.lanes,cars};
  }
  // Deterministic emergency pattern: stagger one short vehicle per lane
  // with a guaranteed opening at the player's column.
  const d=difficulty(level);
  return {
    level,lanes:d.lanes,
    cars:Array.from({length:d.lanes},(_,lane)=>({
      lane,
      x:lane%2===0?8:72,
      width:Math.min(10,7*d.vehicleScale),
      speed:(lane%2===0?1:-1)*Math.max(65,d.speed*.7),
      kind:"car",height:36
    }))
  };
}

const defaultSave={level:1,cash:0,gems:0,completed:0,noHit:0,streak:0,tasks:{five:0,fifteen:0,clean:0,fifty:0,hundred:0}};
function loadSave(){try{return{...defaultSave,...JSON.parse(localStorage.getItem(SAVE_KEY)||"{}")}}catch{return{...defaultSave}}}
let save=loadSave();
let state={level:save.level,player:0,running:true,hit:false,started:false,levelData:null,last:performance.now(),cars:[],animation:null,renderCars:null,renderPlayer:null};

const board=document.querySelector("#board"),cashEl=document.querySelector("#cash"),gemsEl=document.querySelector("#gems"),levelEl=document.querySelector("#level"),message=document.querySelector("#message"),moveButton=document.querySelector("#moveButton"),modal=document.querySelector("#modal"),modalTitle=document.querySelector("#modalTitle"),modalText=document.querySelector("#modalText"),modalButton=document.querySelector("#modalButton");

function persist(){localStorage.setItem(SAVE_KEY,JSON.stringify(save))}
function rewardCash(level){return Math.round(10+Math.sqrt(level)*6.8)}
function renderHud(){cashEl.textContent="£"+save.cash.toLocaleString("en-GB");gemsEl.textContent=save.gems.toLocaleString("en-GB");levelEl.textContent=state.level.toLocaleString("en-GB")}
function showModal(title,text,next){modalTitle.textContent=title;modalText.textContent=text;modalButton.textContent=next?"NEXT LEVEL":"TRY AGAIN";modal.classList.remove("hidden")}
function hideModal(){modal.classList.add("hidden")}

function build(){
  let data=makeLevel(state.level);
  state.levelData=data;
  state.player=0;
  state.running=true;
  state.hit=false;
  state.started=false;
  state.last=performance.now();
  state.cars=data.cars.map(c=>({...c}));
  render();
}
function render(){
  board.replaceChildren();
  const h=board.clientHeight||500;
  const laneH=h/(state.levelData.lanes+2);
  const grassH=laneH;
  const top=document.createElement("div");top.className="grass";top.style.top="0";top.style.height=grassH+"px";board.append(top);
  const bottom=document.createElement("div");bottom.className="grass";bottom.style.bottom="0";bottom.style.height=grassH+"px";board.append(bottom);
  for(let i=0;i<state.levelData.lanes;i++){
    const lane=document.createElement("div");
    lane.className="lane";
    lane.style.top=(grassH+i*laneH)+"px";
    lane.style.height=laneH+"px";
    board.append(lane);
  }
  state.cars.forEach((car,i)=>{
    const el=document.createElement("div");
    el.className="car "+car.kind;
    el.dataset.i=i;
    el.style.width=car.width+"%";
    el.style.height=car.height+"%";
    el.style.left=car.x+"%";
    el.style.top=(grassH+car.lane*laneH+laneH*.29)+"px";
    board.append(el);
  });
  const p=document.createElement("div");
  p.className="player";
  p.textContent="🧍";
  p.style.left="calc(50% - 19px)";
  p.style.bottom=(grassH+state.player*laneH+laneH*.31)+"px";
  board.append(p);
}
function playerRect(){
  const h=board.clientHeight||500,laneH=h/(state.levelData.lanes+2),grassH=laneH;
  return {left:PLAYER_X-3.7,right:PLAYER_X+3.7,top:grassH+(state.levelData.lanes-state.player)*laneH+laneH*.25,bottom:grassH+(state.levelData.lanes-state.player)*laneH+laneH*.72};
}
function carRect(car){
  const h=board.clientHeight||500,laneH=h/(state.levelData.lanes+2),grassH=laneH;
  const center=car.x+car.width/2;
  return {left:center-car.width/2,right:center+car.width/2,top:grassH+car.lane*laneH+laneH*.25,bottom:grassH+car.lane*laneH+laneH*.75};
}
function intersects(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top}
function checkCollision(){
  if(state.player<=0)return false;
  const p=playerRect();
  const lane=state.levelData.lanes-state.player;
  for(const car of state.cars.filter(c=>c.lane===lane)){
    if(intersects(p,carRect(car))){fail();return true}
  }
  return false;
}
function move(){
  if(!state.running)return;
  state.started=true;
  if(checkCollision())return;
  state.player++;
  if(state.player>state.levelData.lanes){complete();return}
  updateRenderPositions();
  if(checkCollision())return;
  message.textContent=state.player===state.levelData.lanes?"One more move!":"Watch the traffic";
}
function fail(){
  if(!state.running)return;
  state.running=false;state.hit=true;save.streak=0;persist();
  board.classList.remove("crash");
  void board.offsetWidth;
  board.classList.add("crash");
  message.textContent="CRASH!";
  setTimeout(()=>showModal("CRASH!","You got hit. Try the same deterministic level again.",false),260);
}
function complete(){
  if(!state.running)return;
  state.running=false;
  const reward=rewardCash(state.level),clean=!state.hit;
  save.cash+=reward;save.completed++;save.streak++;
  save.tasks.five=save.completed;
  if(clean){save.noHit++;save.gems+=15}
  if(save.completed%5===0)save.gems+=10;
  if(save.completed%15===0)save.gems+=25;
  if(save.completed%50===0)save.gems+=50;
  if(save.completed%100===0)save.gems+=100;
  if(state.level<MAX_LEVEL)save.level=state.level+1;
  persist();renderHud();
  board.classList.remove("complete");
  void board.offsetWidth;
  board.classList.add("complete");
  message.textContent="Perfect crossing!";
  const bonus=clean?" +15 gems for a clean crossing.":"";
  setTimeout(()=>showModal("LEVEL COMPLETE",`Cash +£${reward}.${bonus}`,state.level<MAX_LEVEL),300);
}
function frame(now){
  const dt=Math.min(.05,(now-state.last)/1000);state.last=now;
  if(state.running&&state.started){
    state.cars.forEach(c=>{
      c.x+=(c.speed/100)*dt;
      if(c.speed>0&&c.x>105)c.x=-c.width;
      if(c.speed<0&&c.x<-c.width)c.x=105;
    });
    updateRenderPositions();
    if(checkCollision()){requestAnimationFrame(frame);return}
  }
  requestAnimationFrame(frame);
}
moveButton.addEventListener("click",move);
board.addEventListener("pointerdown",e=>{if(e.pointerType==="touch"||e.pointerType==="pen")move()});
modalButton.addEventListener("click",()=>{
  hideModal();
  if(state.hit){build();return}
  state.level=Math.min(MAX_LEVEL,state.level+1);
  save.level=state.level;persist();renderHud();build();
});
document.querySelectorAll(".nav-button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".nav-button").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  if(b.dataset.screen==="tasks")message.textContent="Tasks: every 5 completed levels +10 gems · every 15 +25 · clean crossing +15";
  else if(b.dataset.screen==="shop")message.textContent="Shop is coming after the core game loop is proven.";
  else message.textContent="Tap the road to move";
}));
renderHud();build();requestAnimationFrame(frame);